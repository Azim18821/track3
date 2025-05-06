import { storage } from "./storage";

export async function initSystemSettings() {
  console.log("Initializing default system settings...");
  
  // Check and create default settings
  const defaultSettings = [
    {
      key: "plan_generation_frequency_days",
      value: "30",
      description: "Number of days users must wait before generating a new fitness plan (set to 0 for unlimited generation)"
    },
    {
      key: "fitness_coach_globally_disabled",
      value: "false",
      description: "When set to true, disables the fitness coach feature for all users except admins"
    }
  ];
  
  for (const setting of defaultSettings) {
    const existingSetting = await storage.getSetting(setting.key);
    
    if (!existingSetting) {
      console.log(`Creating default setting: ${setting.key} = ${setting.value}`);
      await storage.setSetting(setting.key, setting.value, setting.description);
    } else {
      console.log(`Setting ${setting.key} already exists with value: ${existingSetting.value}`);
    }
  }
  
  console.log("System settings initialization complete");
}