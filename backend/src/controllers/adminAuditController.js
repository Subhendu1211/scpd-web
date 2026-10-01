import { validationResult } from "express-validator";
import { listUserLogs, listWorkflowLogs } from "../services/auditLogService.js";

const DEFAULT_SCOPE = "user";

export async function list(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const scope = (req.query.scope || DEFAULT_SCOPE).toLowerCase();
  const page = req.query.page ? Number(req.query.page) : 1;
  const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 25;

  try {
    const result = scope === "workflow"
      ? await listWorkflowLogs({ page, pageSize })
      : await listUserLogs({ page, pageSize });

    return res.json({ data: result.data, pagination: result.pagination, scope });
  } catch (error) {
    return res.status(500).json({ error: "Unable to fetch logs" });
  }
}
