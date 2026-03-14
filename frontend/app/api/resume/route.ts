import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(req: Request){

 const data = await req.formData()
 const file = data.get("resume") as File

 if(!file){
  return NextResponse.json(
   {message:"No file uploaded"},
   {status:400}
  )
 }

 const bytes = await file.arrayBuffer()
 const buffer = Buffer.from(bytes)

 const uploadDir = path.join(process.cwd(),"public/uploads")

 if(!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir,{recursive:true})
 }

 const filePath = path.join(uploadDir,file.name)

 fs.writeFileSync(filePath,buffer)

 return NextResponse.json({
  message:"Resume uploaded",
  url:`/uploads/${file.name}`
 })
}