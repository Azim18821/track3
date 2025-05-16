import { setupClientDatabase, addClientToNotion } from "./notion";

// Environment variables validation
if (!process.env.NOTION_INTEGRATION_SECRET) {
    console.error("NOTION_INTEGRATION_SECRET is not defined. Please add it to your environment variables.");
    process.exit(1);
}

if (!process.env.NOTION_PAGE_URL) {
    console.error("NOTION_PAGE_URL is not defined. Please add it to your environment variables.");
    process.exit(1);
}

// Example function to setup the Notion client database
async function setupNotionDatabase() {
    console.log("Setting up Notion client database...");
    
    try {
        const clientsDb = await setupClientDatabase();
        console.log("Clients database successfully created or verified:", clientsDb.id);
        return clientsDb;
    } catch (error) {
        console.error("Error setting up Notion database:", error);
        throw error;
    }
}

// Create sample client data
async function createSampleClients() {
    try {
        console.log("Adding sample clients...");

        const clients = [
            {
                name: "John Smith",
                email: "john.smith@example.com",
                phone: "555-123-4567",
                fitnessGoals: ["Weight Loss", "Strength"],
                age: 32,
                height: 180,
                weight: 85,
                gender: "Male",
                notes: "Wants to focus on strength training while losing weight. Has previous shoulder injury.",
                trainer: "Alex Trainer"
            },
            {
                name: "Sarah Johnson",
                email: "sarah.j@example.com",
                phone: "555-987-6543",
                fitnessGoals: ["Endurance", "Overall Fitness"],
                age: 28,
                height: 165,
                weight: 62,
                gender: "Female",
                notes: "Marathon runner looking to improve overall fitness and recovery.",
                trainer: "Maria Coach"
            },
            {
                name: "Michael Chen",
                email: "m.chen@example.com",
                phone: "555-456-7890",
                fitnessGoals: ["Muscle Gain", "Strength"],
                age: 24,
                height: 175,
                weight: 70,
                gender: "Male",
                notes: "College athlete looking to build muscle mass for competitive sports.",
                trainer: "Alex Trainer"
            },
            {
                name: "Emma Wilson",
                email: "e.wilson@example.com",
                phone: "555-234-5678",
                fitnessGoals: ["Flexibility", "Weight Loss"],
                age: 35,
                height: 168,
                weight: 73,
                gender: "Female",
                notes: "Former dancer looking to improve flexibility and lose weight gained after pregnancy.",
                trainer: "Maria Coach"
            },
            {
                name: "David Thompson",
                email: "d.thompson@example.com",
                phone: "555-876-5432",
                fitnessGoals: ["Overall Fitness"],
                age: 45,
                height: 182,
                weight: 88,
                gender: "Male",
                notes: "Business executive with limited time. Needs efficient workout plan.",
                trainer: "Alex Trainer"
            }
        ];

        for (const client of clients) {
            await addClientToNotion(client);
            console.log(`Created client: ${client.name}`);
        }

        console.log("Sample clients added successfully.");
    } catch (error) {
        console.error("Error creating sample clients:", error);
    }
}

// Run the setup
setupNotionDatabase()
    .then(() => {
        return createSampleClients();
    })
    .then(() => {
        console.log("Notion setup complete!");
        process.exit(0);
    })
    .catch(error => {
        console.error("Setup failed:", error);
        process.exit(1);
    });