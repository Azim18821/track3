import { AIAnalysis } from "../shared/schema";
import { storage } from "./storage";
import OpenAI from "openai";

/**
 * Check if a user has completed the onboarding process
 * @param userId The user ID
 * @returns Object with completion status and onboarding data if available
 */
export async function checkOnboardingStatus(userId: number): Promise<{
  completed: boolean;
  analysisAcknowledged: boolean;
  data?: {
    fitnessGoal?: string;
    bodyType?: string;
    height?: number;
    weight?: number;
    heightUnit?: string;
    weightUnit?: string;
    gender?: string;
    dateOfBirth?: string;
    age?: number;
    analysis?: AIAnalysis | null;
  };
}> {
  try {
    // Get the user profile
    const userProfile = await storage.getUserProfile(userId);
    
    if (!userProfile) {
      return { completed: false, analysisAcknowledged: false };
    }
    
    // Check if the user has completed onboarding
    const completed = !!userProfile.hasCompletedOnboarding;
    
    // Include user data if onboarding is complete
    let data = undefined;
    
    // Check if analysis has been acknowledged
    const analysisAcknowledged = !!userProfile.hasAcknowledgedAnalysis;
    
    if (completed) {
      let analysis = null;
      
      // Parse the AI analysis if it exists
      if (userProfile.aiAnalysis) {
        try {
          analysis = typeof userProfile.aiAnalysis === 'string'
            ? JSON.parse(userProfile.aiAnalysis)
            : userProfile.aiAnalysis;
        } catch (error) {
          console.error("Error parsing AI analysis:", error);
        }
      }
      
      // Return relevant user profile data
      data = {
        fitnessGoal: userProfile.fitnessGoal || undefined,
        bodyType: userProfile.bodyType || undefined,
        height: userProfile.height || undefined,
        weight: userProfile.weight || undefined,
        heightUnit: userProfile.heightUnit || undefined,
        weightUnit: userProfile.weightUnit || undefined,
        gender: userProfile.gender || undefined,
        dateOfBirth: userProfile.dateOfBirth ? userProfile.dateOfBirth.toISOString() : undefined,
        age: userProfile.age || undefined,
        analysis: analysis
      };
    }
    
    return { completed, analysisAcknowledged, data };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw error;
  }
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface OnboardingData {
  fitnessGoal: string; // Legacy field for single goal
  fitnessGoals?: string[]; // New field for multiple goals
  bodyType: string;
  height: number;
  weight: number;
  heightUnit: string;
  weightUnit: string;
  gender: string;
  dateOfBirth: string;
  age?: number;
}

/**
 * Generate fitness analysis for a user during onboarding
 * @param userId The user ID
 * @param data The onboarding data input
 * @returns An analysis with timeframe, description, and recommendations
 */
/**
 * Updates the user's analysis acknowledgment status
 * @param userId The user ID
 * @returns True if the update was successful
 */
export async function acknowledgeAnalysis(userId: number): Promise<boolean> {
  try {
    console.log(`Acknowledging analysis for user ${userId}`);
    
    // Update the user profile
    const result = await storage.updateUserProfile(userId, {
      hasAcknowledgedAnalysis: true
    });
    
    return !!result;
  } catch (error) {
    console.error("Error acknowledging analysis:", error);
    throw error;
  }
}

export async function generateFitnessAnalysis(userId: number, data: OnboardingData): Promise<AIAnalysis> {
  try {
    // Calculate age from DOB if not provided
    let age = data.age;
    if (!age && data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
    }

    // Convert height to cm if in inches
    const heightInCm = data.heightUnit === 'inches' 
      ? Math.round(data.height * 2.54) 
      : data.height;
    
    // Convert weight to kg if in lb
    const weightInKg = data.weightUnit === 'lb' 
      ? Math.round(data.weight * 0.453592) 
      : data.weight;

    // Calculate BMI
    const heightInMeters = heightInCm / 100;
    const bmi = weightInKg / (heightInMeters * heightInMeters);

    // Generate analysis with OpenAI - using more concise prompt per requirements
    
    // Determine goals to use in prompt - prefer multiple goals if available
    let goalsText = '';
    if (data.fitnessGoals && Array.isArray(data.fitnessGoals) && data.fitnessGoals.length > 0) {
      // Format multiple goals
      if (data.fitnessGoals.length === 1) {
        goalsText = `selected the goal: ${data.fitnessGoals[0]}`;
      } else {
        // Format list of goals: "goal1 and goal2"
        goalsText = `selected multiple goals: ${data.fitnessGoals.join(' and ')}`;
      }
    } else {
      // Fall back to legacy single goal
      goalsText = `selected the goal: ${data.fitnessGoal}`;
    }
    
    const prompt = `
      The user is ${heightInCm}cm tall, weighs ${weightInKg}kg, with BMI ${bmi.toFixed(1)}, is ${age || 'unknown'} years old, ${data.gender || 'gender not specified'},
      ${goalsText}. 
      
      Generate a short, motivational, science-based message explaining what they can realistically achieve and in what timeframe.
      Limit to 100 words. Base it on fitness science: e.g. 0.5kg/week fat loss, 0.25–0.5kg/week muscle gain, 
      stamina improvements over 6–12 weeks. Keep the tone positive and realistic.
      
      Provide a JSON response containing:
      1. timeframe: A realistic timeframe for seeing meaningful results (in weeks)
      2. description: A concise, personalized description of their fitness journey (limit to 100 words)
      3. recommendations: An array of 3-5 actionable recommendations specific to their goal and stats
      
      Return ONLY the JSON with no additional text.
    `;

    let analysis: AIAnalysis;
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn("No OpenAI API key found. Using fallback analysis.");
      
      // Determine primary goal for fallback analysis
      const primaryGoal = data.fitnessGoals && Array.isArray(data.fitnessGoals) && data.fitnessGoals.length > 0 
        ? data.fitnessGoals[0] 
        : data.fitnessGoal;
      
      // Determine secondary goal if available
      const hasSecondaryGoal = data.fitnessGoals && Array.isArray(data.fitnessGoals) && data.fitnessGoals.length > 1;
      let secondaryGoal = null;
      if (hasSecondaryGoal && data.fitnessGoals && Array.isArray(data.fitnessGoals) && data.fitnessGoals.length > 1) {
        secondaryGoal = data.fitnessGoals[1];
      }
      
      // Create a description based on goals
      let timeframe, description, recommendations;
      
      // Determine timeframe based on primary goal
      if (primaryGoal === 'weightLoss') {
        timeframe = '4-6';
      } else if (primaryGoal === 'muscleBuild') {
        timeframe = '8-12';
      } else if (primaryGoal === 'weightGain') {
        timeframe = '6-8';
      } else {
        timeframe = '3-5';
      }
      
      // Add some variation if there's a secondary goal
      if (hasSecondaryGoal) {
        timeframe += ` to ${parseInt(timeframe.split('-')[1]) + 2}`;
      }
      
      // Create description with both goals if applicable
      if (hasSecondaryGoal) {
        description = `Based on your combined goals of ${primaryGoal} and ${secondaryGoal}, we recommend a balanced approach that incorporates elements for both objectives.`;
      } else {
        description = `Based on your ${primaryGoal} goal and current measurements, we recommend a focused approach of ${
          primaryGoal === 'weightLoss' ? 'calorie deficit with increased physical activity' : 
          primaryGoal === 'muscleBuild' ? 'progressive resistance training and protein-rich diet' : 
          primaryGoal === 'weightGain' ? 'calorie surplus with structured weight training' : 
          'consistent cardio training and endurance-focused exercises'
        }.`;
      }
      
      // Create recommendations based on primary goal with secondary goal influence if applicable
      recommendations = [
        `Focus on ${
          primaryGoal === 'weightLoss' ? 'creating a moderate calorie deficit of 300-500 calories daily' : 
          primaryGoal === 'muscleBuild' ? 'consuming 1.6-2.0g of protein per kg of body weight' : 
          primaryGoal === 'weightGain' ? 'maintaining a calorie surplus of 300-500 calories daily with adequate protein' :
          'gradually increasing workout duration while maintaining steady intensity'
        }`,
        `Include ${
          primaryGoal === 'weightLoss' ? '3-4 days of mixed cardio and strength training' : 
          primaryGoal === 'muscleBuild' ? '4-5 days of targeted resistance training with progressive overload' : 
          primaryGoal === 'weightGain' ? '3-4 days of compound exercises focusing on major muscle groups' :
          '4-5 days of varied cardio activities with interval training'
        }`,
        `Ensure adequate recovery with 7-9 hours of sleep and proper hydration`,
        `Track your progress weekly and adjust your plan as needed`,
      ];
      
      // Add a recommendation specific to the secondary goal if applicable
      if (hasSecondaryGoal) {
        recommendations.push(`Balance your ${primaryGoal} focus with elements supporting your ${secondaryGoal} goal`);
      }
      
      // Construct the final analysis
      analysis = {
        timeframe: `With consistent effort, you should see noticeable progress within ${timeframe} weeks.`,
        description,
        recommendations,
      };
    } else {
      try {
        // Use real OpenAI API for analysis
        console.log("Generating analysis with OpenAI...");
        
        // Add a timeout of 8 seconds to the OpenAI request
        const timeoutPromise = new Promise<{ choices: [{ message: { content: string } }] }>((_, reject) => {
          setTimeout(() => reject(new Error('OpenAI request timeout')), 8000);
        });

        // Create the actual OpenAI request
        const openaiPromise = openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: "You are a professional fitness coach creating personalized fitness plans."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" }
        });

        // Race the timeout against the actual request
        const response = await Promise.race([openaiPromise, timeoutPromise]);
        
        const content = response.choices[0].message.content;
        analysis = content ? JSON.parse(content) : {
          timeframe: "Results typically take 8-12 weeks with consistent effort.",
          description: "Based on your profile, a balanced approach combining nutrition and exercise is recommended.",
          recommendations: [
            "Maintain consistent workout schedule",
            "Focus on proper nutrition",
            "Ensure adequate recovery and sleep",
            "Track your progress regularly"
          ]
        };
        console.log("OpenAI analysis generated successfully");
      } catch (error) {
        console.error("Error using OpenAI API:", error);
        
        // Fallback to mock data if API call fails
        console.warn("OpenAI API call failed. Using fallback analysis.");
        analysis = {
          timeframe: `With consistent effort, you should see noticeable progress within ${data.fitnessGoal === 'weightLoss' ? '4-6' : data.fitnessGoal === 'muscleBuild' ? '8-12' : '3-5'} weeks.`,
          description: `Based on your ${data.fitnessGoal} goal and current measurements, we recommend a balanced approach of ${data.fitnessGoal === 'weightLoss' ? 'calorie deficit with increased physical activity' : data.fitnessGoal === 'muscleBuild' ? 'progressive resistance training and protein-rich diet' : 'consistent cardio training and endurance-focused exercises'}.`,
          recommendations: [
            `Focus on ${data.fitnessGoal === 'weightLoss' ? 'creating a moderate calorie deficit of 300-500 calories daily' : data.fitnessGoal === 'muscleBuild' ? 'consuming 1.6-2.0g of protein per kg of body weight' : 'gradually increasing workout duration while maintaining steady intensity'}`,
            `Include ${data.fitnessGoal === 'weightLoss' ? '3-4 days of mixed cardio and strength training' : data.fitnessGoal === 'muscleBuild' ? '4-5 days of targeted resistance training with progressive overload' : '4-5 days of varied cardio activities with interval training'}`,
            `Ensure adequate recovery with 7-9 hours of sleep and proper hydration`,
            `Track your progress weekly and adjust your plan as needed`,
          ],
        };
      }
    }

    // First, update the user profile with all onboarding data
    console.log(`[SERVICE:1] About to update user profile with onboarding data for user ${userId}`);
    // Convert analysis to JSON string for database storage
    const analysisJson = analysis ? JSON.stringify(analysis) : null;
    console.log(`[SERVICE:1.1] Analysis JSON for storage: ${analysisJson}`);
    
    const profileUpdateResult = await storage.updateUserProfile(userId, {
      // Include all the user profile data from onboarding
      fitnessGoal: data.fitnessGoal, // Keep for backwards compatibility
      fitnessGoals: data.fitnessGoals, // Include the array of multiple fitness goals
      bodyType: data.bodyType,
      height: data.height,
      weight: data.weight,
      heightUnit: data.heightUnit,
      weightUnit: data.weightUnit,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      // Include the AI analysis in JSON format
      aiAnalysis: analysisJson,
      // Mark onboarding as completed
      hasCompletedOnboarding: true
    });
    
    console.log(`[SERVICE:2] User profile update result: ${profileUpdateResult ? 'SUCCESS' : 'FAILED'}`);
    if (profileUpdateResult) {
      console.log(`[SERVICE:3] Updated profile data: ${JSON.stringify({
        fitnessGoal: profileUpdateResult.fitnessGoal,
        bodyType: profileUpdateResult.bodyType,
        height: profileUpdateResult.height,
        weight: profileUpdateResult.weight,
        hasCompletedOnboarding: profileUpdateResult.hasCompletedOnboarding
      })}`);
    }
    
    // Now store the analysis for future reference
    console.log(`[SERVICE:4] About to save analysis to database for user ${userId}`);
    const saveResult = await storage.saveOnboardingAnalysis(userId, analysis);
    console.log(`[SERVICE:5] Analysis save result: ${saveResult ? 'SUCCESS' : 'FAILED'}`);
    
    // Verify that it was saved
    const savedAnalysis = await storage.getOnboardingAnalysis(userId);
    console.log(`[SERVICE:6] Verification - Retrieved analysis from DB: ${savedAnalysis ? 'FOUND' : 'NOT FOUND'}`);
    if (savedAnalysis) {
      console.log(`[SERVICE:7] Analysis timeframe: ${savedAnalysis.timeframe}, description length: ${savedAnalysis.description.length}`);
    }

    return analysis;
  } catch (error) {
    console.error("Error generating fitness analysis:", error);
    throw error;
  }
}