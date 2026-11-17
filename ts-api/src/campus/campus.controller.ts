// ts-api/src/campus/campus.controller.ts
import {
  Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { CollegeRole, DriveStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CampusActor } from './campus-tenant.service';
import { CampusAcademicsService } from './campus-academics.service';
import { CampusDriveService } from './campus-drive.service';
import { CampusApplicationService } from './campus-application.service';
import { CampusOfferService } from './campus-offer.service';
import { CampusAnalyticsService } from './campus-analytics.service';
import { CAMPUS_ROLES, COLLEGE_STAFF } from './campus.constants';
import {
  ApplyDriveDto, ApplicantFilterDto, BulkNotifyDto, BulkStatusDto, CreateBranchDto,
  CreateCampusDto, CreateCollegeDto, CreateCompanyDto, CreateDepartmentDto, CreateDriveDto,
  EligibleStudentsDto, ImportStudentsDto, ReleaseOfferDto, RespondOfferDto,
  ScheduleCampusInterviewDto, SetCriteriaDto, SetDriveCollegesDto, SetEligibilityDto,
  StudentFilterDto, UpdateBranchDto, UpdateDriveDto,
} from './dto/campus.dto';

type Req_ = { user: CampusActor };

@Controller('campus')
@UseGuards(JwtAuthGuard)
export class CampusController {
  constructor(
    private readonly academics: CampusAcademicsService,
    private readonly drives: CampusDriveService,
    private readonly applications: CampusApplicationService,
    private readonly offers: CampusOfferService,
    private readonly analytics: CampusAnalyticsService,
  ) {}

  // ── Company ───────────────────────────────────────────────────────────────
  @Post('companies')
  @Roles(CAMPUS_ROLES.RECRUITER)
  createCompany(@Req() req: Req_, @Body() dto: CreateCompanyDto) {
    return this.academics.createCompany(req.user, dto);
  }

  @Get('companies/mine')
  @Roles(CAMPUS_ROLES.RECRUITER)
  myCompanies(@Req() req: Req_) {
    return this.academics.myCompanies(req.user);
  }

  // ── College / academics ───────────────────────────────────────────────────
  @Post('colleges')
  @Roles(CAMPUS_ROLES.SUPER_ADMIN, CAMPUS_ROLES.ADMIN)
  createCollege(@Req() req: Req_, @Body() dto: CreateCollegeDto) {
    return this.academics.createCollege(req.user, dto);
  }

  @Get('colleges')
  listColleges() {
    return this.academics.listColleges();
  }

  @Get('colleges/mine')
  @Roles(...COLLEGE_STAFF)
  myColleges(@Req() req: Req_) {
    return this.academics.myColleges(req.user);
  }

  @Post('colleges/:collegeId/members')
  @Roles(CAMPUS_ROLES.COLLEGE_ADMIN, CAMPUS_ROLES.SUPER_ADMIN)
  addMember(
    @Req() req: Req_,
    @Param('collegeId', ParseUUIDPipe) collegeId: string,
    @Body() body: { userId: string; role: CollegeRole },
  ) {
    return this.academics.addCollegeMember(req.user, collegeId, body.userId, body.role);
  }

  @Post('colleges/:collegeId/campuses')
  @Roles(CAMPUS_ROLES.COLLEGE_ADMIN, CAMPUS_ROLES.TPO)
  createCampus(
    @Req() req: Req_, @Param('collegeId', ParseUUIDPipe) collegeId: string, @Body() dto: CreateCampusDto,
  ) {
    return this.academics.createCampus(req.user, collegeId, dto);
  }

  @Post('colleges/:collegeId/departments')
  @Roles(CAMPUS_ROLES.COLLEGE_ADMIN, CAMPUS_ROLES.TPO)
  createDepartment(
    @Req() req: Req_, @Param('collegeId', ParseUUIDPipe) collegeId: string, @Body() dto: CreateDepartmentDto,
  ) {
    return this.academics.createDepartment(req.user, collegeId, dto);
  }

  @Post('colleges/:collegeId/branches')
  @Roles(CAMPUS_ROLES.COLLEGE_ADMIN, CAMPUS_ROLES.TPO)
  createBranch(
    @Req() req: Req_, @Param('collegeId', ParseUUIDPipe) collegeId: string, @Body() dto: CreateBranchDto,
  ) {
    return this.academics.createBranch(req.user, collegeId, dto);
  }

  @Patch('branches/:branchId')
  @Roles(CAMPUS_ROLES.COLLEGE_ADMIN, CAMPUS_ROLES.TPO)
  updateBranch(
    @Req() req: Req_, @Param('branchId', ParseUUIDPipe) branchId: string, @Body() dto: UpdateBranchDto,
  ) {
    return this.academics.updateBranch(req.user, branchId, dto);
  }

  @Get('colleges/:collegeId/academics')
  @Roles(...COLLEGE_STAFF)
  academicTree(@Req() req: Req_, @Param('collegeId', ParseUUIDPipe) collegeId: string) {
    return this.academics.academicTree(req.user, collegeId);
  }

  @Get('branches/catalogue')
  @Roles(CAMPUS_ROLES.RECRUITER, ...COLLEGE_STAFF)
  branchCatalogue() {
    return this.academics.branchCatalogue();
  }

  @Get('colleges/:collegeId/students')
  @Roles(...COLLEGE_STAFF)
  students(
    @Req() req: Req_, @Param('collegeId', ParseUUIDPipe) collegeId: string, @Query() query: StudentFilterDto,
  ) {
    return this.academics.listStudents(req.user, collegeId, query);
  }

  @Post('colleges/:collegeId/students/import')
  @Roles(CAMPUS_ROLES.COLLEGE_ADMIN, CAMPUS_ROLES.TPO)
  importStudents(
    @Req() req: Req_, @Param('collegeId', ParseUUIDPipe) collegeId: string, @Body() dto: ImportStudentsDto,
  ) {
    return this.academics.importStudents(req.user, collegeId, dto);
  }

  @Get('batches/:batchId')
  batch(@Req() req: Req_, @Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.academics.batchStatus(req.user, batchId);
  }

  // ── Recruiter drives ──────────────────────────────────────────────────────
  @Post('drives')
  @Roles(CAMPUS_ROLES.RECRUITER)
  createDrive(@Req() req: Req_, @Body() dto: CreateDriveDto) {
    return this.drives.create(req.user, dto);
  }

  @Get('drives/mine')
  @Roles(CAMPUS_ROLES.RECRUITER)
  myDrives(@Req() req: Req_) {
    return this.drives.listMine(req.user);
  }

  @Get('drives/overview')
  @Roles(CAMPUS_ROLES.RECRUITER)
  overview(@Req() req: Req_) {
    return this.analytics.recruiterOverview(req.user);
  }

  @Get('drives/:driveId')
  @Roles(CAMPUS_ROLES.RECRUITER)
  drive(@Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string) {
    return this.drives.detail(req.user, driveId);
  }

  @Patch('drives/:driveId')
  @Roles(CAMPUS_ROLES.RECRUITER)
  updateDrive(
    @Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string, @Body() dto: UpdateDriveDto,
  ) {
    return this.drives.update(req.user, driveId, dto);
  }

  @Put('drives/:driveId/colleges')
  @Roles(CAMPUS_ROLES.RECRUITER)
  setColleges(
    @Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string, @Body() dto: SetDriveCollegesDto,
  ) {
    return this.drives.setColleges(req.user, driveId, dto);
  }

  @Put('drives/:driveId/eligibility')
  @Roles(CAMPUS_ROLES.RECRUITER)
  setEligibility(
    @Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string, @Body() dto: SetEligibilityDto,
  ) {
    return this.drives.setEligibility(req.user, driveId, dto);
  }

  @Put('drives/:driveId/criteria')
  @Roles(CAMPUS_ROLES.RECRUITER)
  setCriteria(
    @Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string, @Body() dto: SetCriteriaDto,
  ) {
    return this.drives.setCriteria(req.user, driveId, dto);
  }

  @Post('drives/:driveId/publish')
  @Roles(CAMPUS_ROLES.RECRUITER)
  publish(@Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string) {
    return this.drives.publish(req.user, driveId);
  }

  @Patch('drives/:driveId/status')
  @Roles(CAMPUS_ROLES.RECRUITER)
  setStatus(
    @Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string, @Body('status') status: DriveStatus,
  ) {
    return this.drives.setStatus(req.user, driveId, status);
  }

  @Get('drives/:driveId/applicants')
  @Roles(CAMPUS_ROLES.RECRUITER)
  applicants(
    @Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string, @Query() query: ApplicantFilterDto,
  ) {
    return this.applications.listApplicants(req.user, driveId, query);
  }

  @Post('drives/:driveId/applicants/bulk-status')
  @Roles(CAMPUS_ROLES.RECRUITER)
  bulkStatus(
    @Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string, @Body() dto: BulkStatusDto,
  ) {
    return this.applications.bulkStatus(req.user, driveId, dto);
  }

  @Post('drives/:driveId/applicants/bulk-notify')
  @Roles(CAMPUS_ROLES.RECRUITER)
  bulkNotify(
    @Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string, @Body() dto: BulkNotifyDto,
  ) {
    return this.applications.bulkNotify(req.user, driveId, dto);
  }

  @Post('drives/:driveId/export')
  @Roles(CAMPUS_ROLES.RECRUITER)
  export(@Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string) {
    return this.applications.exportApplicants(req.user, driveId);
  }

  @Post('drives/:driveId/applicants/:applicationId/interviews')
  @Roles(CAMPUS_ROLES.RECRUITER)
  scheduleInterview(
    @Req() req: Req_,
    @Param('driveId', ParseUUIDPipe) driveId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: ScheduleCampusInterviewDto,
  ) {
    return this.applications.scheduleInterview(req.user, driveId, applicationId, dto);
  }

  @Post('drives/:driveId/offers')
  @Roles(CAMPUS_ROLES.RECRUITER)
  releaseOffer(
    @Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string, @Body() dto: ReleaseOfferDto,
  ) {
    return this.offers.release(req.user, driveId, dto);
  }

  @Get('drives/:driveId/offers')
  @Roles(CAMPUS_ROLES.RECRUITER)
  driveOffers(@Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string) {
    return this.offers.listForDrive(req.user, driveId);
  }

  @Get('drives/:driveId/analytics')
  @Roles(CAMPUS_ROLES.RECRUITER)
  driveAnalytics(@Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string) {
    return this.analytics.driveAnalytics(req.user, driveId);
  }

  @Patch('offers/:offerId/joined')
  @Roles(CAMPUS_ROLES.RECRUITER)
  markJoined(@Req() req: Req_, @Param('offerId', ParseUUIDPipe) offerId: string) {
    return this.offers.markJoined(req.user, offerId);
  }

  // ── Placement cell ────────────────────────────────────────────────────────
  @Get('placement/colleges/:collegeId/drives')
  @Roles(...COLLEGE_STAFF)
  placementDrives(@Req() req: Req_, @Param('collegeId', ParseUUIDPipe) collegeId: string) {
    return this.drives.listForCollege(req.user, collegeId);
  }

  @Get('placement/drives/:driveId/eligible-students')
  @Roles(...COLLEGE_STAFF)
  eligibleStudents(
    @Req() req: Req_,
    @Param('driveId', ParseUUIDPipe) driveId: string,
    @Query('collegeId', ParseUUIDPipe) collegeId: string,
    @Query() query: EligibleStudentsDto,
  ) {
    return this.drives.eligibleStudents(req.user, driveId, collegeId, query);
  }

  @Get('placement/colleges/:collegeId/offers')
  @Roles(...COLLEGE_STAFF)
  collegeOffers(@Req() req: Req_, @Param('collegeId', ParseUUIDPipe) collegeId: string) {
    return this.offers.listForCollege(req.user, collegeId);
  }

  @Get('placement/colleges/:collegeId/analytics')
  @Roles(...COLLEGE_STAFF)
  collegeAnalytics(@Req() req: Req_, @Param('collegeId', ParseUUIDPipe) collegeId: string) {
    return this.analytics.collegeAnalytics(req.user, collegeId);
  }

  // ── Student ───────────────────────────────────────────────────────────────
  @Get('student/drives')
  @Roles(CAMPUS_ROLES.STUDENT)
  studentDrives(@Req() req: Req_) {
    return this.applications.listForStudent(req.user.id);
  }

  @Post('student/drives/:driveId/apply')
  @Roles(CAMPUS_ROLES.STUDENT)
  apply(
    @Req() req: Req_, @Param('driveId', ParseUUIDPipe) driveId: string, @Body() dto: ApplyDriveDto,
  ) {
    return this.applications.apply(req.user.id, driveId, dto);
  }

  @Get('student/applications')
  @Roles(CAMPUS_ROLES.STUDENT)
  studentApplications(@Req() req: Req_) {
    return this.applications.myApplications(req.user.id);
  }

  @Get('student/offers')
  @Roles(CAMPUS_ROLES.STUDENT)
  studentOffers(@Req() req: Req_) {
    return this.offers.myOffers(req.user.id);
  }

  @Patch('student/offers/:offerId/respond')
  @Roles(CAMPUS_ROLES.STUDENT)
  respond(
    @Req() req: Req_, @Param('offerId', ParseUUIDPipe) offerId: string, @Body() dto: RespondOfferDto,
  ) {
    return this.offers.respond(req.user.id, offerId, dto);
  }
}