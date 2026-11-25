import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireMerchantAuth, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Project } from '../../models/project.model';
import { AuditLog } from '../../models/auditLog.model';

const router = Router();

// GET /api/v1/projects - List all projects for authenticated merchant
router.get('/', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const projects = await Project.find({ merchantId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: projects.map((p) => ({
        id: p._id,
        name: p.name,
        code: p.code,
        description: p.description,
        webhookUrl: p.webhookUrl,
        webhookSecret: p.webhookSecret,
        environment: p.environment,
        isActive: p.isActive,
        totalOrders: p.totalOrders,
        totalVolumeInPaise: p.totalVolumeInPaise,
        createdAt: p.createdAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch projects', error: err.message });
  }
});

// POST /api/v1/projects - Create a new app/project
router.post('/', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const { name, code, description, webhookUrl, environment } = req.body;

    if (!name || !code) {
      res.status(400).json({ success: false, message: 'Project name and uppercase code (e.g. SUMIOLAB) are required' });
      return;
    }

    const cleanCode = code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');

    const existing = await Project.findOne({ merchantId, code: cleanCode });
    if (existing) {
      res.status(409).json({ success: false, message: `Project code "${cleanCode}" already exists for your merchant account` });
      return;
    }

    const webhookSecret = 'whsec_' + crypto.randomBytes(24).toString('hex');

    const project = await Project.create({
      merchantId,
      name: name.trim(),
      code: cleanCode,
      description: description || '',
      webhookUrl: webhookUrl || '',
      webhookSecret,
      environment: environment === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION',
      isActive: true,
    });

    // Record audit log
    await AuditLog.create({
      actorType: 'MERCHANT',
      actorId: merchantId,
      actorEmail: req.merchant!.email,
      merchantId,
      action: 'PROJECT_CREATED',
      resourceType: 'PROJECT',
      resourceId: project._id.toString(),
      newState: { name: project.name, code: project.code, environment: project.environment },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Project creation failed', error: err.message });
  }
});

// GET /api/v1/projects/:id - Get project details
router.get('/:id', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const project = await Project.findOne({ _id: req.params.id, merchantId });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    res.status(200).json({ success: true, data: project });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve project', error: err.message });
  }
});

// PUT /api/v1/projects/:id - Update project configuration
router.put('/:id', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const { name, description, webhookUrl, environment, isActive } = req.body;

    const project = await Project.findOne({ _id: req.params.id, merchantId });
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const previousState = project.toObject();

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (webhookUrl !== undefined) project.webhookUrl = webhookUrl;
    if (environment !== undefined) project.environment = environment;
    if (isActive !== undefined) project.isActive = isActive;

    await project.save();

    await AuditLog.create({
      actorType: 'MERCHANT',
      actorId: merchantId,
      actorEmail: req.merchant!.email,
      merchantId,
      action: 'PROJECT_UPDATED',
      resourceType: 'PROJECT',
      resourceId: project._id.toString(),
      previousState,
      newState: project.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({ success: true, message: 'Project updated', data: project });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update project', error: err.message });
  }
});

export default router;
