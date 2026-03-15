import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { supabase } from '../lib/supabase'
import * as pdf from 'pdf-parse'

@Injectable()
export class ResumesService {

 constructor(private prisma: PrismaService) {}

 async saveRawResume(file: Express.Multer.File, userId: string) {

  const fileName = `${Date.now()}-${file.originalname}`

  // Upload to Supabase Storage
  const { error } = await supabase.storage
   .from('resume-files')
   .upload(fileName, file.buffer)

  if (error) {
   throw new Error(error.message)
  }

  const fileUrl =
   `${process.env.SUPABASE_URL}/storage/v1/object/public/resume-files/${fileName}`

  // Parse Resume
  const parsed = await pdf(file.buffer)

  const resume = await this.prisma.resume.create({
   data:{
    userId,
    fileName,
    fileUrl,
    parsedText: parsed.text,
    status:'uploaded'
   }
  })

  return resume
 }
}