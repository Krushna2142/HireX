import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIService } from '../../ai/ai.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
  namespace: '/interviews',
})
export class InterviewGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;
  private logger = new Logger('InterviewGateway');
  private userSockets = new Map<string, string>(); // userId -> socketId
  private roomUsers = new Map<string, Set<string>>(); // roomId -> Set<userId>

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private aiService: AIService,
  ) {}

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  afterInit(server: Server) {
    this.logger.log('✅ Interview WebSocket Gateway initialized');
  }

  async handleConnection(@ConnectedSocket() socket: Socket) {
    try {
      // Verify JWT token
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.disconnect();
        this.logger.warn('❌ Connection attempt without token');
        return;
      }

      const decoded = await this.jwtService.verify(token);
      socket.data.userId = decoded.sub;
      socket.data.userRole = decoded.role;

      this.userSockets.set(decoded.sub, socket.id);
      this.logger.log(
        `✅ User connected: ${decoded.sub} (${socket.id}) - Role: ${decoded.role}`,
      );
    } catch (error) {
      this.logger.error('❌ Connection error:', this.getErrorMessage(error));
      socket.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() socket: Socket) {
    if (socket.data.userId) {
      this.userSockets.delete(socket.data.userId);
      this.logger.log(`❌ User disconnected: ${socket.data.userId}`);
    }
  }

  /**
   * Join Interview Room
   */
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      socket.join(`room:${data.roomId}`);

      // FIX: Ensure roomUsers Map entry exists
      if (!this.roomUsers.has(data.roomId)) {
        this.roomUsers.set(data.roomId, new Set());
      }

      const roomSet = this.roomUsers.get(data.roomId);
      if (roomSet) {
        roomSet.add(socket.data.userId);
      }

      this.server.to(`room:${data.roomId}`).emit('user:joined', {
        userId: socket.data.userId,
        userRole: socket.data.userRole,
        timestamp: new Date(),
      });

      this.logger.log(
        `👤 User ${socket.data.userId} joined room ${data.roomId}`,
      );
    } catch (error) {
      this.logger.error('❌ Join room error:', this.getErrorMessage(error));
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  /**
   * Leave Interview Room
   */
  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      socket.leave(`room:${data.roomId}`);

      // FIX: Safely access and delete from roomUsers
      const roomSet = this.roomUsers.get(data.roomId);
      if (roomSet) {
        roomSet.delete(socket.data.userId);
        
        // Clean up empty room entries
        if (roomSet.size === 0) {
          this.roomUsers.delete(data.roomId);
        }
      }

      this.server.to(`room:${data.roomId}`).emit('user:left', {
        userId: socket.data.userId,
        timestamp: new Date(),
      });

      this.logger.log(
        `👋 User ${socket.data.userId} left room ${data.roomId}`,
      );
    } catch (error) {
      this.logger.error('❌ Leave room error:', this.getErrorMessage(error));
    }
  }

  /**
   * Request AI Suggestion (Recruiter)
   */
  @SubscribeMessage('ai:request_suggestion')
  async handleAISuggestion(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; context: any },
  ) {
    if (socket.data.userRole !== 'recruiter') {
      socket.emit('error', { message: 'Only recruiters can request AI suggestions' });
      return;
    }

    try {
      // Emit loading state
      socket.emit('ai:loading');

      // Generate suggestion based on context
      let suggestion: any;

      if (data.context.type === 'follow_up_question') {
        const questions = await this.aiService.generateInterviewQuestions(
          data.context.jobDescription || '',
          data.context.candidateLevel || 'mid',
          1,
        );
        suggestion = {
          id: Math.random().toString(),
          type: 'question',
          text: questions[0]?.question || 'Unable to generate question',
          timestamp: new Date(),
          confidence: 0.85,
        };
      } else if (data.context.type === 'candidate_assessment') {
        const assessment = await this.aiService.scoreCandidate(
          data.context.transcript || '',
          data.context.rubric || {},
          data.context.jobDescription,
        );
        suggestion = {
          id: Math.random().toString(),
          type: 'insight',
          text: `Overall Score: ${assessment.overall_score}%. Key strengths: ${assessment.strengths.join(', ')}`,
          timestamp: new Date(),
          confidence: 0.9,
        };
      }

      // Send suggestion to recruiter
      socket.emit('ai:suggestion', suggestion);

      // Store AI note in database
      if (data.context.interviewRoundId) {
        await this.prisma.recruiter_interview_notes.create({
          data: {
            interview_round_id: data.context.interviewRoundId,
            recruiter_id: socket.data.userId,
            note_text: suggestion.text,
            ai_generated: true,
            confidence_score: suggestion.confidence,
          },
        });
      }

      this.logger.log(
        `🧠 AI suggestion generated for recruiter ${socket.data.userId}`,
      );
    } catch (error) {
      this.logger.error('❌ AI suggestion error:', this.getErrorMessage(error));
      socket.emit('error', { message: 'Failed to generate suggestion' });
    } finally {
      socket.emit('ai:loaded');
    }
  }

  /**
   * Send Interview Message (Chat)
   */
  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: { roomId: string; message: string; sessionId?: string },
  ) {
    try {
      // Store message in database
      if (data.sessionId) {
        await this.prisma.interview_chat_messages.create({
          data: {
            room_id: data.roomId,
            session_id: data.sessionId,
            sender_id: socket.data.userId,
            message: data.message,
          },
        });
      }

      // Broadcast to room
      this.server.to(`room:${data.roomId}`).emit('message:received', {
        userId: socket.data.userId,
        message: data.message,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('❌ Message error:', this.getErrorMessage(error));
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Share Screen/Media State
   */
  @SubscribeMessage('media:state_change')
  handleMediaStateChange(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      roomId: string;
      state: {
        audioEnabled?: boolean;
        videoEnabled?: boolean;
        screenSharing?: boolean;
      };
    },
  ) {
    try {
      this.server.to(`room:${data.roomId}`).emit('media:state_changed', {
        userId: socket.data.userId,
        state: data.state,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('❌ Media state error:', this.getErrorMessage(error));
    }
  }

  /**
   * Recording Status Update
   */
  @SubscribeMessage('recording:status')
  async handleRecordingStatus(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      roomId: string;
      sessionId: string;
      status: 'started' | 'stopped' | 'paused' | 'resumed';
    },
  ) {
    try {
      // Log recording event
      await this.prisma.interview_events_log.create({
        data: {
          session_id: data.sessionId,
          room_id: data.roomId,
          actor_user_id: socket.data.userId,
          event_type: `recording_${data.status}`,
          payload: { timestamp: new Date() },
        },
      });

      // Broadcast to room
      this.server.to(`room:${data.roomId}`).emit('recording:status_changed', {
        status: data.status,
        timestamp: new Date(),
      });

      this.logger.log(
        `🎥 Recording ${data.status} in room ${data.roomId}`,
      );
    } catch (error) {
      this.logger.error('❌ Recording status error:', this.getErrorMessage(error));
    }
  }

  /**
   * Emit suggestion to specific recruiter (used by services)
   */
  broadcastToRecruiter(recruiterId: string, suggestion: any) {
    const socketId = this.userSockets.get(recruiterId);
    if (socketId) {
      this.server.to(socketId).emit('ai:suggestion', suggestion);
    }
  }

  /**
   * Emit event to room
   */
  broadcastToRoom(roomId: string, event: string, data: any) {
    this.server.to(`room:${roomId}`).emit(event, data);
  }
}