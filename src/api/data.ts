import { Router } from "express";
import { db, logAuditEvent } from "../db/index";
import { assessmentItems, auditLogs, users } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export const dataRouter = Router();

dataRouter.get("/assessments", async (req, res) => {
  try {
    // Return all items for org o1
    const items = await db.select().from(assessmentItems).where(eq(assessmentItems.orgId, "o1")).orderBy(desc(assessmentItems.createdAt));
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

dataRouter.get("/assessments/:id", async (req, res) => {
  try {
    const item = await db.select().from(assessmentItems).where(eq(assessmentItems.id, req.params.id));
    res.json(item[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

dataRouter.post("/assessments", async (req, res) => {
  try {
    const { title } = req.body;
    const id = "i" + Date.now();
    await db.insert(assessmentItems).values({
      id,
      orgId: "o1",
      title,
      status: "interview"
    });
    logAuditEvent("u1", "item.created", "assessment_items", `Created assessment: ${title}`);
    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

dataRouter.post("/assessments/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(assessmentItems)
      .set({ status: "approved" })
      .where(eq(assessmentItems.id, id));
      
    logAuditEvent("u1", "item.approved_by_user", "assessment_items", `Item ${id} approved`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

dataRouter.post("/assessments/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(assessmentItems)
      .set({ status: "rejected" })
      .where(eq(assessmentItems.id, id));
      
    logAuditEvent("u1", "item.rejected_by_user", "assessment_items", `Item ${id} rejected`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

dataRouter.post("/assessments/:id/extract", async (req, res) => {
  try {
    const { id } = req.params;
    const { extracted_data, assurance_rating } = req.body;
    await db.update(assessmentItems)
      .set({ 
        status: "review", 
        extractedData: JSON.stringify(extracted_data), 
        assuranceRating: assurance_rating 
      })
      .where(eq(assessmentItems.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

dataRouter.get("/audit-logs", async (req, res) => {
  try {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
