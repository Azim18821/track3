import { Router, Request, Response } from "express";
import { ensureAuthenticated, ensureTrainer } from "./auth";
import {
  getClientsFromNotion,
  getClientFromNotion,
  addClientToNotion,
  updateClientInNotion,
  deleteClientFromNotion
} from "./notion";

const router = Router();

// Check if Notion integration is properly configured
const isNotionConfigured = () => {
  return process.env.NOTION_INTEGRATION_SECRET && process.env.NOTION_PAGE_URL;
};

// Middleware to check if Notion is configured
const checkNotionConfig = (req: Request, res: Response, next: Function) => {
  if (!isNotionConfigured()) {
    return res.status(503).json({
      error: "Notion integration not configured",
      message: "Please configure NOTION_INTEGRATION_SECRET and NOTION_PAGE_URL environment variables"
    });
  }
  next();
};

// Get all clients from Notion
router.get("/clients", ensureTrainer, checkNotionConfig, async (req: Request, res: Response) => {
  try {
    const clients = await getClientsFromNotion();
    res.status(200).json(clients);
  } catch (error: any) {
    console.error("Error fetching clients from Notion:", error);
    res.status(500).json({
      error: "Failed to fetch clients",
      message: error.message
    });
  }
});

// Get a specific client from Notion
router.get("/clients/:id", ensureTrainer, checkNotionConfig, async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    const client = await getClientFromNotion(clientId);
    res.status(200).json(client);
  } catch (error: any) {
    console.error(`Error fetching client ${req.params.id} from Notion:`, error);
    res.status(500).json({
      error: "Failed to fetch client",
      message: error.message
    });
  }
});

// Add a new client to Notion
router.post("/clients", ensureTrainer, checkNotionConfig, async (req: Request, res: Response) => {
  try {
    const clientData = req.body;
    
    // Validate required fields
    if (!clientData.name || !clientData.email) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Name and email are required"
      });
    }
    
    const newClient = await addClientToNotion(clientData);
    res.status(201).json(newClient);
  } catch (error: any) {
    console.error("Error adding client to Notion:", error);
    res.status(500).json({
      error: "Failed to add client",
      message: error.message
    });
  }
});

// Update a client in Notion
router.put("/clients/:id", ensureTrainer, checkNotionConfig, async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    const updateData = req.body;
    
    const updatedClient = await updateClientInNotion(clientId, updateData);
    res.status(200).json(updatedClient);
  } catch (error: any) {
    console.error(`Error updating client ${req.params.id} in Notion:`, error);
    res.status(500).json({
      error: "Failed to update client",
      message: error.message
    });
  }
});

// Delete (archive) a client in Notion
router.delete("/clients/:id", ensureTrainer, checkNotionConfig, async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    await deleteClientFromNotion(clientId);
    res.status(204).send();
  } catch (error: any) {
    console.error(`Error deleting client ${req.params.id} from Notion:`, error);
    res.status(500).json({
      error: "Failed to delete client",
      message: error.message
    });
  }
});

// Run the Notion setup via API (for admins/trainers)
router.post("/setup", ensureTrainer, checkNotionConfig, async (req: Request, res: Response) => {
  try {
    // Import the setup functions dynamically to avoid circular dependencies
    const { setupNotionDatabase } = require("./setup-notion");
    
    await setupNotionDatabase();
    res.status(200).json({ message: "Notion database setup complete" });
  } catch (error: any) {
    console.error("Error setting up Notion database:", error);
    res.status(500).json({
      error: "Failed to set up Notion database",
      message: error.message
    });
  }
});

export default router;