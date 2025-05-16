import { Client } from "@notionhq/client";

// Initialize Notion client
export const notion = new Client({
    auth: process.env.NOTION_INTEGRATION_SECRET!,
});

// Extract the page ID from the Notion page URL
function extractPageIdFromUrl(pageUrl: string): string {
    const match = pageUrl.match(/([a-f0-9]{32})(?:[?#]|$)/i);
    if (match && match[1]) {
        return match[1];
    }

    throw Error("Failed to extract page ID");
}

export const NOTION_PAGE_ID = process.env.NOTION_PAGE_URL ? extractPageIdFromUrl(process.env.NOTION_PAGE_URL) : "";

/**
 * Lists all child databases contained within NOTION_PAGE_ID
 * @returns {Promise<Array<{id: string, title: string}>>} - Array of database objects with id and title
 */
export async function getNotionDatabases() {
    if (!process.env.NOTION_INTEGRATION_SECRET || !process.env.NOTION_PAGE_URL) {
        throw new Error("Notion API credentials not configured");
    }

    // Array to store the child databases
    const childDatabases = [];

    try {
        // Query all child blocks in the specified page
        let hasMore = true;
        let startCursor: string | undefined = undefined;

        while (hasMore) {
            const response = await notion.blocks.children.list({
                block_id: NOTION_PAGE_ID,
                start_cursor: startCursor,
            });

            // Process the results
            for (const block of response.results) {
                // Check if the block is a child database
                if (block.type === "child_database") {
                    const databaseId = block.id;

                    // Retrieve the database title
                    try {
                        const databaseInfo = await notion.databases.retrieve({
                            database_id: databaseId,
                        });

                        // Add the database to our list
                        childDatabases.push(databaseInfo);
                    } catch (error) {
                        console.error(`Error retrieving database ${databaseId}:`, error);
                    }
                }
            }

            // Check if there are more results to fetch
            hasMore = response.has_more;
            startCursor = response.next_cursor || undefined;
        }

        return childDatabases;
    } catch (error) {
        console.error("Error listing child databases:", error);
        throw error;
    }
}

// Find a Notion database with the matching title
export async function findDatabaseByTitle(title: string) {
    const databases = await getNotionDatabases();

    for (const db of databases) {
        if (db.title && Array.isArray(db.title) && db.title.length > 0) {
            const dbTitle = db.title[0]?.plain_text?.toLowerCase() || "";
            if (dbTitle === title.toLowerCase()) {
                return db;
            }
        }
    }

    return null;
}

// Create a new database if one with a matching title does not exist
export async function createDatabaseIfNotExists(title: string, properties: any) {
    const existingDb = await findDatabaseByTitle(title);
    if (existingDb) {
        return existingDb;
    }
    return await notion.databases.create({
        parent: {
            type: "page_id",
            page_id: NOTION_PAGE_ID
        },
        title: [
            {
                type: "text",
                text: {
                    content: title
                }
            }
        ],
        properties
    });
}

// Create a client database for storing client information
export async function setupClientDatabase() {
    return await createDatabaseIfNotExists("Clients", {
        Name: {
            title: {}
        },
        Email: {
            email: {}
        },
        Phone: {
            phone_number: {}
        },
        JoinDate: {
            date: {}
        },
        Status: {
            select: {
                options: [
                    { name: "Active", color: "green" },
                    { name: "Inactive", color: "red" },
                    { name: "Pending", color: "yellow" }
                ]
            }
        },
        FitnessGoal: {
            multi_select: {
                options: [
                    { name: "Weight Loss", color: "blue" },
                    { name: "Muscle Gain", color: "orange" },
                    { name: "Endurance", color: "purple" },
                    { name: "Strength", color: "green" },
                    { name: "Flexibility", color: "pink" },
                    { name: "Overall Fitness", color: "gray" }
                ]
            }
        },
        Age: {
            number: {}
        },
        Height: {
            number: {}
        },
        Weight: {
            number: {}
        },
        Gender: {
            select: {
                options: [
                    { name: "Male", color: "blue" },
                    { name: "Female", color: "pink" },
                    { name: "Other", color: "gray" },
                    { name: "Prefer not to say", color: "default" }
                ]
            }
        },
        Notes: {
            rich_text: {}
        },
        AssignedTrainer: {
            select: {}
        },
        PlanStatus: {
            select: {
                options: [
                    { name: "Has Active Plan", color: "green" },
                    { name: "Needs Plan", color: "yellow" },
                    { name: "Plan Expired", color: "red" }
                ]
            }
        },
        LastCheckIn: {
            date: {}
        }
    });
}

// Function to add a client to the Notion database
export async function addClientToNotion(client: {
    name: string;
    email: string;
    phone?: string;
    fitnessGoals?: string[];
    age?: number;
    height?: number;
    weight?: number;
    gender?: string;
    notes?: string;
    trainer?: string;
}) {
    if (!process.env.NOTION_INTEGRATION_SECRET || !process.env.NOTION_PAGE_URL) {
        throw new Error("Notion API credentials not configured");
    }

    // Find the clients database
    const clientsDb = await findDatabaseByTitle("Clients");
    if (!clientsDb) {
        throw new Error("Clients database not found. Please run setup first.");
    }

    // Build the properties object for the new client
    const properties: any = {
        Name: {
            title: [
                {
                    type: "text",
                    text: {
                        content: client.name
                    }
                }
            ]
        },
        Email: {
            email: client.email
        },
        JoinDate: {
            date: {
                start: new Date().toISOString()
            }
        },
        Status: {
            select: {
                name: "Active"
            }
        }
    };

    // Add optional properties if provided
    if (client.phone) {
        properties.Phone = {
            phone_number: client.phone
        };
    }

    if (client.fitnessGoals && client.fitnessGoals.length > 0) {
        properties.FitnessGoal = {
            multi_select: client.fitnessGoals.map(goal => ({ name: goal }))
        };
    }

    if (client.age !== undefined) {
        properties.Age = {
            number: client.age
        };
    }

    if (client.height !== undefined) {
        properties.Height = {
            number: client.height
        };
    }

    if (client.weight !== undefined) {
        properties.Weight = {
            number: client.weight
        };
    }

    if (client.gender) {
        properties.Gender = {
            select: {
                name: client.gender
            }
        };
    }

    if (client.notes) {
        properties.Notes = {
            rich_text: [
                {
                    type: "text",
                    text: {
                        content: client.notes
                    }
                }
            ]
        };
    }

    if (client.trainer) {
        properties.AssignedTrainer = {
            select: {
                name: client.trainer
            }
        };
    }

    properties.PlanStatus = {
        select: {
            name: "Needs Plan"
        }
    };

    // Create the page in the database
    try {
        const response = await notion.pages.create({
            parent: {
                database_id: clientsDb.id
            },
            properties
        });

        return response;
    } catch (error) {
        console.error("Error adding client to Notion:", error);
        throw error;
    }
}

// Function to get all clients from the Notion database
export async function getClientsFromNotion() {
    if (!process.env.NOTION_INTEGRATION_SECRET || !process.env.NOTION_PAGE_URL) {
        throw new Error("Notion API credentials not configured");
    }

    // Find the clients database
    const clientsDb = await findDatabaseByTitle("Clients");
    if (!clientsDb) {
        throw new Error("Clients database not found. Please run setup first.");
    }

    try {
        const response = await notion.databases.query({
            database_id: clientsDb.id,
            sorts: [
                {
                    property: "Name",
                    direction: "ascending"
                }
            ]
        });

        // Transform the Notion response into a more usable format
        return response.results.map((page: any) => {
            const properties = page.properties;
            
            return {
                id: page.id,
                name: properties.Name?.title?.[0]?.plain_text || "Unnamed Client",
                email: properties.Email?.email || "",
                phone: properties.Phone?.phone_number || "",
                joinDate: properties.JoinDate?.date?.start ? new Date(properties.JoinDate.date.start) : null,
                status: properties.Status?.select?.name || "Active",
                fitnessGoals: properties.FitnessGoal?.multi_select?.map((item: any) => item.name) || [],
                age: properties.Age?.number || null,
                height: properties.Height?.number || null,
                weight: properties.Weight?.number || null,
                gender: properties.Gender?.select?.name || null,
                notes: properties.Notes?.rich_text?.[0]?.plain_text || "",
                assignedTrainer: properties.AssignedTrainer?.select?.name || null,
                planStatus: properties.PlanStatus?.select?.name || "Needs Plan",
                lastCheckIn: properties.LastCheckIn?.date?.start ? new Date(properties.LastCheckIn.date.start) : null
            };
        });
    } catch (error) {
        console.error("Error fetching clients from Notion:", error);
        throw error;
    }
}

// Function to update a client in the Notion database
export async function updateClientInNotion(
    clientId: string,
    updates: {
        name?: string;
        email?: string;
        phone?: string;
        fitnessGoals?: string[];
        age?: number;
        height?: number;
        weight?: number;
        gender?: string;
        notes?: string;
        trainer?: string;
        status?: string;
        planStatus?: string;
        lastCheckIn?: Date;
    }
) {
    if (!process.env.NOTION_INTEGRATION_SECRET || !process.env.NOTION_PAGE_URL) {
        throw new Error("Notion API credentials not configured");
    }

    const properties: any = {};

    // Add properties that are being updated
    if (updates.name !== undefined) {
        properties.Name = {
            title: [
                {
                    type: "text",
                    text: {
                        content: updates.name
                    }
                }
            ]
        };
    }

    if (updates.email !== undefined) {
        properties.Email = {
            email: updates.email
        };
    }

    if (updates.phone !== undefined) {
        properties.Phone = {
            phone_number: updates.phone
        };
    }

    if (updates.fitnessGoals !== undefined) {
        properties.FitnessGoal = {
            multi_select: updates.fitnessGoals.map(goal => ({ name: goal }))
        };
    }

    if (updates.age !== undefined) {
        properties.Age = {
            number: updates.age
        };
    }

    if (updates.height !== undefined) {
        properties.Height = {
            number: updates.height
        };
    }

    if (updates.weight !== undefined) {
        properties.Weight = {
            number: updates.weight
        };
    }

    if (updates.gender !== undefined) {
        properties.Gender = {
            select: {
                name: updates.gender
            }
        };
    }

    if (updates.notes !== undefined) {
        properties.Notes = {
            rich_text: [
                {
                    type: "text",
                    text: {
                        content: updates.notes
                    }
                }
            ]
        };
    }

    if (updates.trainer !== undefined) {
        properties.AssignedTrainer = {
            select: {
                name: updates.trainer
            }
        };
    }

    if (updates.status !== undefined) {
        properties.Status = {
            select: {
                name: updates.status
            }
        };
    }

    if (updates.planStatus !== undefined) {
        properties.PlanStatus = {
            select: {
                name: updates.planStatus
            }
        };
    }

    if (updates.lastCheckIn !== undefined) {
        properties.LastCheckIn = {
            date: {
                start: updates.lastCheckIn.toISOString()
            }
        };
    }

    try {
        const response = await notion.pages.update({
            page_id: clientId,
            properties
        });

        return response;
    } catch (error) {
        console.error("Error updating client in Notion:", error);
        throw error;
    }
}

// Function to delete a client from the Notion database
export async function deleteClientFromNotion(clientId: string) {
    if (!process.env.NOTION_INTEGRATION_SECRET || !process.env.NOTION_PAGE_URL) {
        throw new Error("Notion API credentials not configured");
    }

    try {
        // Notion doesn't have a delete API, so we archive the page instead
        const response = await notion.pages.update({
            page_id: clientId,
            archived: true
        });

        return response;
    } catch (error) {
        console.error("Error deleting client from Notion:", error);
        throw error;
    }
}

// Function to get a single client from the Notion database
export async function getClientFromNotion(clientId: string) {
    if (!process.env.NOTION_INTEGRATION_SECRET || !process.env.NOTION_PAGE_URL) {
        throw new Error("Notion API credentials not configured");
    }

    try {
        const response = await notion.pages.retrieve({
            page_id: clientId
        });

        const properties = response.properties as any;
        
        return {
            id: response.id,
            name: properties.Name?.title?.[0]?.plain_text || "Unnamed Client",
            email: properties.Email?.email || "",
            phone: properties.Phone?.phone_number || "",
            joinDate: properties.JoinDate?.date?.start ? new Date(properties.JoinDate.date.start) : null,
            status: properties.Status?.select?.name || "Active",
            fitnessGoals: properties.FitnessGoal?.multi_select?.map((item: any) => item.name) || [],
            age: properties.Age?.number || null,
            height: properties.Height?.number || null,
            weight: properties.Weight?.number || null,
            gender: properties.Gender?.select?.name || null,
            notes: properties.Notes?.rich_text?.[0]?.plain_text || "",
            assignedTrainer: properties.AssignedTrainer?.select?.name || null,
            planStatus: properties.PlanStatus?.select?.name || "Needs Plan",
            lastCheckIn: properties.LastCheckIn?.date?.start ? new Date(properties.LastCheckIn.date.start) : null
        };
    } catch (error) {
        console.error(`Error fetching client ${clientId} from Notion:`, error);
        throw error;
    }
}