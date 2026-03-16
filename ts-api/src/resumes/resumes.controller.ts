/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResumesService } from './resumes.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller('resumes')
@UseGuards(JwtAuthGuard)   // ← protects every route in this controller
export class ResumesController {
  private readonly logger = new Logger(ResumesController.name);

  constructor(private readonly service: ResumesService) {}

  // ── POST /resumes/upload-raw ──────────────────────────────────────────────
  // IMPORTANT: This static route MUST be declared before /:id
  // NestJS matches top-to-bottom — if /:id came first, 'upload-raw'
  // would be captured as the :id param and routed to getById().

  @Post('upload-raw')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  async uploadRaw(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    this.logger.log(`POST /resumes/upload-raw — user: ${req.user?.id}`);

    if (!req.user?.id) throw new BadRequestException('User not authenticated');
    if (!file) throw new BadRequestException(
      'No file received. Ensure field name is "file" and Content-Type is multipart/form-data',
    );

    this.logger.log(`Received: ${file.originalname} | ${file.mimetype} | ${file.size} bytes`);

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: "${file.mimetype}". Accepted: PDF, DOCX, DOC`,
      );
    }
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('File exceeds 5MB limit');
    if (!file.buffer?.length)      throw new BadRequestException('File buffer is empty');

    return this.service.saveRawResume(file, req.user.id);
  }

  // ── GET /resumes — list current user's resumes ────────────────────────────

  @Get()
  async listResumes(@Req() req: any) {
    this.logger.log(`GET /resumes — user: ${req.user?.id}`);
    return this.service.listByUser(req.user.id);
  }

  // ── GET /resumes/:id — poll resume status ─────────────────────────────────
  // Called every 5s by frontend pollResumeStatus() until status is terminal

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`GET /resumes/${id} — user: ${req.user?.id}`);
    return this.service.getById(id, req.user.id);
  }

  // ── GET /resumes/:id/analysis — fetch completed analysis ─────────────────
  // Returns 404 while still processing — frontend handles this gracefully

  @Get(':id/analysis')
  async getAnalysis(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`GET /resumes/${id}/analysis — user: ${req.user?.id}`);
    return this.service.getAnalysis(id, req.user.id);
  }
}
/*

---

## Why Route Order Matters Here
```
WRONG order — 'upload-raw' is shadowed:        CORRECT order:
─────────────────────────────────────────       ──────────────────────────────
@Get(':id')          ← captures 'upload-raw'   @Post('upload-raw')  ← static first
@Get(':id/analysis') ← never reached           @Get()
@Post('upload-raw')  ← unreachable             @Get(':id')          ← dynamic after
                                                @Get(':id/analysis') ← most specific last


NestJS resolves routes in declaration order within a controller. Static segments always need to precede dynamic `:param` segments — otherwise the dynamic param swallows them.

---

## The Full Request Lifecycle After This Fix
```
Frontend polls GET /resumes/:id every 5s
         │
         ▼
ResumesController.getById()
         │
         ▼
ResumesService.getById()  →  prisma.resume.findUnique()
         │
         ├─ status: 'uploaded'    → 200, frontend keeps polling
         ├─ status: 'processing'  → 200, frontend keeps polling  
         ├─ status: 'analyzed'    → 200, frontend calls getAnalysis()
         └─ status: 'failed'      → 200, frontend shows error

Frontend calls GET /resumes/:id/analysis
         │
         ▼
ResumesService.getAnalysis()  →  prisma.resumeAnalysis.findUnique()
         │
         ├─ found   → 200 with full analysis data
         └─ missing → 404 (analysis not ready — frontend handles gracefully)*/