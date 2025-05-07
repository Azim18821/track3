import OpenAI from "openai";
import { NutritionGoal, User, InsertWorkout, Weight, AIAnalysis } from "@shared/schema";
import { FitnessPreferences, FitnessPlan } from "./chatbot";
import { storage } from "./storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interface for tracking user conversation history with the AI coach
interface AICoachConversation {
  userId: number;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
    timestamp: Date;
  }>;
  context: {
    currentPlanId?: number;
    lastWorkoutCompleted?: Date;
    weightHistory?: {
      date: Date;
      weight: number;
      unit: string;
    }[];
    adherenceMetrics?: {
      workoutAdherence: number; // 0-1 representation of completed vs planned workouts
      nutritionAdherence: number; // 0-1 representation based on logged meals
    };
    user?: {
      bodyType: string | null;
      fitnessGoal: string | null;
      height: number | null;
      weight: number | null;
      heightUnit: string | null;
      weightUnit: string | null;
      gender: string | null;
      age: number | null;
      activityLevel: string | null;
      workoutDaysPerWeek: number | null;
      workoutDuration: number | null;
      fitnessLevel: string | null;
    };
    onboardingAnalysis?: AIAnalysis | null;
    
    // Detailed fitness plan data
    fitnessPlan?: {
      preferences: any;
      workoutPlan: any;
      mealPlan: any;
      createdAt: Date;
    };
    
    // Recent workout history
    recentWorkouts?: any[];
    
    // Recent meal history
    recentMeals?: any[];
    
    // Budget information
    budgetInfo?: {
      amount: number | string;
      type: string;
      currency: string;
    };
  };
}

// Storage for conversation history (in-memory with memory optimization)
const conversationStore: Record<number, AICoachConversation> = {};

// Memory management constants
const MAX_CONVERSATIONS = 100; // Maximum number of conversations to keep in memory
const MAX_MESSAGES_PER_CONVERSATION = 20; // Maximum number of messages to keep per user
const CONVERSATION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MEMORY_CLEANUP_INTERVAL = 60 * 60 * 1000; // Run cleanup every hour

// Timestamps for last activity per user
const lastUserActivity: Record<number, number> = {};

// Function to clean up memory periodically
function cleanupConversations() {
  console.log("Running AI coach conversation memory cleanup...");
  const now = Date.now();
  
  // 1. Clean up inactive conversations
  for (const userId in lastUserActivity) {
    const lastActive = lastUserActivity[userId];
    if (now - lastActive > CONVERSATION_TIMEOUT) {
      console.log(`Cleaning up inactive conversation for user ${userId}, inactive for ${(now - lastActive) / (60 * 60 * 1000)} hours`);
      delete conversationStore[userId];
      delete lastUserActivity[userId];
    }
  }
  
  // 2. If we still have too many conversations, remove the oldest ones
  if (Object.keys(conversationStore).length > MAX_CONVERSATIONS) {
    console.log(`Too many conversations in memory (${Object.keys(conversationStore).length}), removing oldest ones`);
    const usersByActivity = Object.entries(lastUserActivity)
      .map(([userId, timestamp]) => ({ userId: Number(userId), timestamp }))
      .sort((a, b) => a.timestamp - b.timestamp);
      
    const usersToRemove = usersByActivity.slice(0, usersByActivity.length - MAX_CONVERSATIONS);
    
    for (const { userId } of usersToRemove) {
      delete conversationStore[userId];
      delete lastUserActivity[userId];
    }
  }
}

// Set up periodic memory cleanup
setInterval(cleanupConversations, MEMORY_CLEANUP_INTERVAL);

/**
 * Gets or initializes a conversation for a user
 */
async function getUserConversation(userId: number): Promise<AICoachConversation> {
  // Track user activity timestamp for memory cleanup
  lastUserActivity[userId] = Date.now();
  
  if (!conversationStore[userId]) {
    console.log(`Initializing new conversation for user ${userId}`);
    // Initialize a new conversation
    conversationStore[userId] = {
      userId,
      messages: [
        {
          role: "system",
          content: getSystemPrompt(),
          timestamp: new Date()
        }
      ],
      context: {}
    };
    
    // Load context data
    await refreshUserContext(userId);
  } else {
    // If the conversation exists but has too many messages, trim it
    if (conversationStore[userId].messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      console.log(`Trimming conversation for user ${userId} from ${conversationStore[userId].messages.length} to ${MAX_MESSAGES_PER_CONVERSATION} messages`);
      // Keep the system prompt (first message) and the most recent messages
      const systemPrompt = conversationStore[userId].messages[0];
      const recentMessages = conversationStore[userId].messages.slice(-(MAX_MESSAGES_PER_CONVERSATION - 1));
      conversationStore[userId].messages = [systemPrompt, ...recentMessages];
    }
  }
  
  return conversationStore[userId];
}

/**
 * Refreshes the user context with latest data
 */
async function refreshUserContext(userId: number): Promise<void> {
  try {
    // Fetch current active plan if it exists with all details
    const activePlan = await storage.getActiveFitnessPlan(userId);
    
    // Fetch recent workouts to calculate adherence and for reference
    const userWorkouts = await storage.getWorkouts(userId);
    const completedWorkouts = userWorkouts.filter(w => w.completed).length;
    const totalWorkouts = userWorkouts.length;
    const workoutAdherence = totalWorkouts > 0 ? completedWorkouts / totalWorkouts : 0;
    
    // Get recent completed workouts for reference
    const recentCompletedWorkouts = userWorkouts
      .filter(w => w.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Last 5 completed workouts
    
    // Get weight history
    const weightHistory = await storage.getWeights(userId);
    
    // Get the user's complete profile data
    const user = await storage.getUser(userId);
    
    // Get the onboarding analysis if available
    const onboardingAnalysis = await storage.getOnboardingAnalysis(userId);
    
    // Calculate nutrition adherence if meal logging data is available
    const mealLogs = await storage.getMealLogs(userId);
    const recentMealLogs = mealLogs.filter(m => 
      new Date(m.date).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)
    );
    const nutritionAdherence = recentMealLogs.length >= 7 ? 0.8 : recentMealLogs.length / 7;
    
    // Get the most recent meals for reference
    const recentMeals = mealLogs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Last 10 meals
    
    // Update the context
    if (conversationStore[userId]) {
      // Preserve existing conversation messages
      const existingMessages = conversationStore[userId].messages || [];
      
      // Create enhanced context with detailed plan information
      const newContext = {
        currentPlanId: activePlan?.id,
        lastWorkoutCompleted: userWorkouts.filter(w => w.completed).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0]?.date,
        weightHistory: weightHistory.map(w => ({
          date: new Date(w.date),
          weight: w.weight,
          unit: w.unit || 'kg'
        })),
        adherenceMetrics: {
          workoutAdherence,
          nutritionAdherence
        },
        user: user ? {
          bodyType: user.bodyType || null,
          fitnessGoal: user.fitnessGoal || null,
          height: user.height || null,
          weight: user.weight || null,
          heightUnit: user.heightUnit || null,
          weightUnit: user.weightUnit || null,
          gender: user.gender || null,
          age: user.age || null,
          activityLevel: user.activityLevel || null,
          workoutDaysPerWeek: user.workoutDaysPerWeek || null,
          workoutDuration: user.workoutDuration || null,
          fitnessLevel: user.fitnessLevel || null
        } : undefined,
        onboardingAnalysis: onboardingAnalysis || null,
        
        // Add detailed fitness plan data
        fitnessPlan: activePlan ? {
          preferences: activePlan.preferences,
          workoutPlan: activePlan.workoutPlan,
          mealPlan: activePlan.mealPlan,
          createdAt: activePlan.createdAt
        } : undefined,
        
        // Add workout history for reference
        recentWorkouts: recentCompletedWorkouts,
        
        // Add meal history for reference
        recentMeals: recentMeals,
        
        // Add shopping budget information if available
        budgetInfo: activePlan?.preferences?.budget ? {
          amount: activePlan.preferences.budget,
          type: activePlan.preferences.budgetType || 'weekly',
          currency: '£' // Default to GBP as per system design
        } : undefined
      };
      
      // Update context while preserving existing messages
      conversationStore[userId].context = newContext;
      conversationStore[userId].messages = existingMessages;
    }
  } catch (error) {
    console.error("Error refreshing user context:", error);
  }
}

/**
 * Returns the system prompt with instructions for the AI coach
 */
function getSystemPrompt(options: { quickMode?: boolean } = {}): string {
  const basePrompt = `
    You are an advanced AI personal fitness coach with expertise in exercise science, nutrition, 
    and behavior change psychology. You provide personalized fitness guidance based on the user's 
    data, preferences, and progress over time.
    
    CAPABILITIES:
    - Access and analyze detailed fitness plan data including workout schedules, meal plans, and shopping budgets
    - Reference previous conversations to maintain continuity and personalization
    - Monitor recent meals and workouts to provide relevant advice and feedback
    - Analyze workout and nutrition data to provide personalized insights
    - Adjust fitness plans based on performance, adherence, and changing goals
    - Provide motivational support and accountability
    - Interpret weight fluctuations and progress metrics
    - Generate structured fitness and meal plans
    
    GUIDELINES:
    - Be supportive, encouraging, and professional in tone
    - When asked to create a fitness plan, workout plan, or meal plan, provide your response in natural, easy-to-read text
    - For workout plans, structure your response like this:
      
      WEEKLY WORKOUT SCHEDULE:
      
      MONDAY - Upper Body
      * Exercise 1: 3 sets of 10 reps with 90s rest
      * Exercise 2: 3 sets of 12 reps with 60s rest
      
      TUESDAY - Lower Body
      * Exercise 1: 3 sets of 10 reps with 90s rest
      * Exercise 2: 3 sets of 12 reps with 60s rest
      
      And so on for each day...
      
    - For meal plans, structure your response like this:
      
      WEEKLY MEAL PLAN:
      
      MONDAY
      * Breakfast: Meal name with brief description (approx. calories, protein, carbs, fat)
      * Lunch: Meal name with brief description (approx. calories, protein, carbs, fat)
      * Dinner: Meal name with brief description (approx. calories, protein, carbs, fat)
      * Snacks: 1-2 options as appropriate
      
      TUESDAY
      * Breakfast: ...
      
      And so on for each day...
    - Provide evidence-based recommendations
    - Respect the user's goals, preferences, and limitations
    - Offer specific, actionable advice rather than generic tips
    - Adjust recommendations based on the user's adherence and progress
    - When designing workouts, consider principles of progressive overload, recovery, and periodization
    - For nutrition, focus on sustainable habits rather than restrictive approaches
    
    Always remember the user's name and reference their specific progress and challenges.
    Maintain a helpful and supportive tone throughout your interactions.
  `;
  
  // Add additional instructions for quick mode
  if (options.quickMode) {
    return basePrompt + `
    
    QUICK MODE INSTRUCTIONS:
    - The user is in "Quick Chat" mode without having created a detailed fitness plan yet
    - Focus on providing general fitness advice and answering questions rather than referencing a specific plan
    - Encourage the user to create a personalized fitness plan for more tailored guidance
    - Keep responses concise and actionable even without detailed user data
    - If asked about specifics (like "my workout today"), provide general guidance since no plan exists
    - Mention that creating a full fitness plan will unlock more personalized AI coaching features
    `;
  }
  
  return basePrompt;
}

/**
 * Generates context-aware prompt based on user data
 */
function generateUserContextPrompt(userId: number, conversation: AICoachConversation): string {
  const { context } = conversation;
  
  let contextPrompt = `
    USER CONTEXT:
    - User ID: ${userId}
  `;
  
  // Include user profile information from onboarding
  if (context.user) {
    if (context.user.bodyType) {
      contextPrompt += `\n    - Body Type: ${context.user.bodyType}`;
    }
    
    if (context.user.fitnessGoal) {
      contextPrompt += `\n    - Fitness Goal: ${context.user.fitnessGoal}`;
    }
    
    if (context.user.gender) {
      contextPrompt += `\n    - Gender: ${context.user.gender}`;
    }
    
    if (context.user.age) {
      contextPrompt += `\n    - Age: ${context.user.age} years`;
    }
    
    if (context.user.height) {
      contextPrompt += `\n    - Height: ${context.user.height} ${context.user.heightUnit || 'cm'}`;
    }
    
    if (context.user.weight) {
      contextPrompt += `\n    - Current Weight: ${context.user.weight} ${context.user.weightUnit || 'kg'}`;
    }
    
    if (context.user.activityLevel) {
      contextPrompt += `\n    - Activity Level: ${context.user.activityLevel}`;
    }
    
    if (context.user.fitnessLevel) {
      contextPrompt += `\n    - Fitness Level: ${context.user.fitnessLevel}`;
    }
    
    if (context.user.workoutDaysPerWeek) {
      contextPrompt += `\n    - Workout Days: ${context.user.workoutDaysPerWeek} days per week`;
    }
    
    if (context.user.workoutDuration) {
      contextPrompt += `\n    - Workout Duration: ${context.user.workoutDuration} minutes`;
    }
  }
  
  // Include any AI analysis from onboarding
  if (context.onboardingAnalysis) {
    contextPrompt += `\n\n    INITIAL FITNESS ANALYSIS:`;
    contextPrompt += `\n    - Timeframe for results: ${context.onboardingAnalysis.timeframe}`;
    contextPrompt += `\n    - Analysis: ${context.onboardingAnalysis.description}`;
    
    // Add key recommendations from initial analysis
    if (context.onboardingAnalysis.recommendations && context.onboardingAnalysis.recommendations.length > 0) {
      contextPrompt += `\n    - Key recommendations:`;
      context.onboardingAnalysis.recommendations.forEach((rec: string, index: number) => {
        if (index < 3) { // Limit to first 3 recommendations to save space
          contextPrompt += `\n      * ${rec}`;
        }
      });
    }
  }
  
  if (context.currentPlanId) {
    contextPrompt += `\n\n    ACTIVE PLAN:`;
    contextPrompt += `\n    - Has active fitness plan (ID: ${context.currentPlanId})`;
    
    // Add detailed fitness plan information if available
    if (context.fitnessPlan) {
      const plan = context.fitnessPlan;
      
      // Add workout plan details
      if (plan.workoutPlan && plan.workoutPlan.weeklySchedule) {
        contextPrompt += `\n\n    WORKOUT PLAN:`;
        
        // Add a summary of workout days
        const workoutDays = Object.keys(plan.workoutPlan.weeklySchedule);
        contextPrompt += `\n    - Workout days: ${workoutDays.join(', ')}`;
        
        // Add workout notes if available
        if (plan.workoutPlan.notes) {
          contextPrompt += `\n    - Workout guidance: ${plan.workoutPlan.notes}`;
        }
        
        // Add examples of a few exercises from the plan
        const sampleDay = workoutDays[0]; // Get the first day as an example
        if (sampleDay && plan.workoutPlan.weeklySchedule[sampleDay]) {
          const dayPlan = plan.workoutPlan.weeklySchedule[sampleDay];
          contextPrompt += `\n    - Example workout (${sampleDay}): ${dayPlan.name}`;
          
          if (dayPlan.exercises && dayPlan.exercises.length > 0) {
            dayPlan.exercises.slice(0, 2).forEach(exercise => {
              contextPrompt += `\n      * ${exercise.name}: ${exercise.sets} sets of ${exercise.reps} reps`;
            });
            if (dayPlan.exercises.length > 2) {
              contextPrompt += `\n      * (Plus ${dayPlan.exercises.length - 2} more exercises)`;
            }
          }
        }
      }
      
      // Add meal plan details
      if (plan.mealPlan) {
        contextPrompt += `\n\n    MEAL PLAN:`;
        
        // Add meal plan notes if available
        if (plan.mealPlan.notes) {
          contextPrompt += `\n    - Nutrition guidance: ${plan.mealPlan.notes}`;
        }
        
        // Add example meals from the plan
        if (plan.mealPlan.weeklyMeals) {
          const mealDays = Object.keys(plan.mealPlan.weeklyMeals);
          if (mealDays.length > 0) {
            const sampleDay = mealDays[0]; // First day as example
            const dayMeals = plan.mealPlan.weeklyMeals[sampleDay];
            
            contextPrompt += `\n    - Example meals (${sampleDay}):`;
            
            if (dayMeals.breakfast) {
              contextPrompt += `\n      * Breakfast: ${dayMeals.breakfast.name} (${dayMeals.breakfast.calories} cal, ${dayMeals.breakfast.protein}g protein)`;
            }
            
            if (dayMeals.lunch) {
              contextPrompt += `\n      * Lunch: ${dayMeals.lunch.name} (${dayMeals.lunch.calories} cal, ${dayMeals.lunch.protein}g protein)`;
            }
            
            if (dayMeals.dinner) {
              contextPrompt += `\n      * Dinner: ${dayMeals.dinner.name} (${dayMeals.dinner.calories} cal, ${dayMeals.dinner.protein}g protein)`;
            }
          }
        }
      }
      
      // Add budget information if available
      if (context.budgetInfo) {
        contextPrompt += `\n\n    SHOPPING BUDGET:`;
        contextPrompt += `\n    - ${context.budgetInfo.currency}${context.budgetInfo.amount} ${context.budgetInfo.type}`;
      }
    }
  } else {
    contextPrompt += `\n\n    PLAN STATUS:`;
    contextPrompt += `\n    - No active fitness plan`;
  }
  
  if (context.lastWorkoutCompleted) {
    const daysSinceLastWorkout = Math.floor((Date.now() - new Date(context.lastWorkoutCompleted).getTime()) / (1000 * 60 * 60 * 24));
    contextPrompt += `\n    - Last workout completed: ${daysSinceLastWorkout} days ago`;
  }
  
  contextPrompt += `\n\n    PROGRESS DATA:`;
  
  if (context.weightHistory && context.weightHistory.length > 0) {
    const sortedWeights = [...context.weightHistory].sort((a, b) => b.date.getTime() - a.date.getTime());
    const latestWeight = sortedWeights[0];
    const oldestWeight = sortedWeights[sortedWeights.length - 1];
    
    contextPrompt += `\n    - Current weight: ${latestWeight.weight} ${latestWeight.unit}`;
    
    if (sortedWeights.length > 1) {
      const weightDiff = latestWeight.weight - oldestWeight.weight;
      const daysDiff = Math.floor((latestWeight.date.getTime() - oldestWeight.date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 0) {
        const changeDirection = weightDiff > 0 ? "gained" : "lost";
        contextPrompt += `\n    - Has ${changeDirection} ${Math.abs(weightDiff).toFixed(1)} ${latestWeight.unit} over ${daysDiff} days`;
      }
    }
  }
  
  if (context.adherenceMetrics) {
    const { workoutAdherence, nutritionAdherence } = context.adherenceMetrics;
    
    contextPrompt += `\n    - Workout adherence: ${Math.round(workoutAdherence * 100)}%`;
    contextPrompt += `\n    - Nutrition adherence: ${Math.round(nutritionAdherence * 100)}%`;
    
    // Provide adherence insights
    if (workoutAdherence < 0.5) {
      contextPrompt += `\n    - Struggling with workout consistency`;
    } else if (workoutAdherence > 0.8) {
      contextPrompt += `\n    - Excellent workout consistency`;
    }
  }
  
  // Add recent workout data
  if (context.recentWorkouts && context.recentWorkouts.length > 0) {
    contextPrompt += `\n\n    RECENT WORKOUTS:`;
    context.recentWorkouts.slice(0, 3).forEach((workout, index) => {
      contextPrompt += `\n    - ${new Date(workout.date).toLocaleDateString()}: ${workout.name}`;
    });
  }
  
  // Add recent meal data
  if (context.recentMeals && context.recentMeals.length > 0) {
    contextPrompt += `\n\n    RECENT MEALS:`;
    context.recentMeals.slice(0, 3).forEach((meal, index) => {
      contextPrompt += `\n    - ${new Date(meal.date).toLocaleDateString()}: ${meal.name} (${meal.calories} cal, ${meal.protein}g protein)`;
    });
  }
  
  return contextPrompt;
}

/**
 * Sends a message to the AI coach and gets a response
 */
export async function chatWithAICoach(
  userId: number,
  user: User,
  message: string,
  options: { quickMode?: boolean } = {}
): Promise<{ response: string, conversationId: number }> {
  try {
    const conversation = await getUserConversation(userId);
    
    // Refresh context to ensure we have the latest data
    await refreshUserContext(userId);
    
    // Add context to the conversation
    const contextPrompt = generateUserContextPrompt(userId, conversation);
    
    // Add the user's message to the conversation
    conversation.messages.push({
      role: "user",
      content: `${contextPrompt}\n\nUSER MESSAGE: ${message}`,
      timestamp: new Date()
    });
    
    // Optimize message length for API calls - keep more recent messages
    // with a hard cap on total message count
    const MAX_API_MESSAGES = Math.min(8, MAX_MESSAGES_PER_CONVERSATION - 2);
    
    // Since we're using the system message separately, we need MAX_API_MESSAGES - 1
    const recentMessages = conversation.messages.slice(-(MAX_API_MESSAGES));
    
    // Log message count for debugging
    console.log(`AI Coach: Sending ${recentMessages.length} recent messages to API for user ${userId}`);
    
    // Get the system prompt based on options
    const systemPrompt = getSystemPrompt(options);
    
    // Prepare messages array with system prompt
    const messagesWithSystem = [
      { role: "system" as const, content: systemPrompt },
      ...recentMessages.map(m => ({ 
        role: m.role as "system" | "user" | "assistant", 
        content: m.content 
      }))
    ];
    
    // Calculate approximate token count (rough estimate) to monitor usage
    const estimatedTokens = messagesWithSystem.reduce((total, msg) => {
      // Rough estimate: 1 token ≈ 4 characters for English text
      return total + Math.ceil(msg.content.length / 4);
    }, 0);
    
    console.log(`AI Coach: Estimated input tokens: ${estimatedTokens} for user ${userId}`);
    
    // Generate a response using the OpenAI API - always use text format
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messagesWithSystem,
      temperature: 0.7,
      max_tokens: 800
    });
    
    const assistantMessage = response.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try again.";
    
    // Add the assistant's response to the conversation
    conversation.messages.push({
      role: "assistant",
      content: assistantMessage,
      timestamp: new Date()
    });
    
    // Log actual token usage when available
    if (response.usage) {
      console.log(`AI Coach: Actual token usage for user ${userId}: 
        Input tokens: ${response.usage.prompt_tokens}
        Output tokens: ${response.usage.completion_tokens}
        Total tokens: ${response.usage.total_tokens}`);
    }
    
    return {
      response: assistantMessage,
      conversationId: userId  // Using userId as the conversationId for simplicity
    };
  } catch (error) {
    console.error("Error chatting with AI coach:", error);
    throw new Error("Failed to communicate with AI coach");
  }
}

/**
 * Generates an enhanced fitness plan with learning capability
 */
export async function generateAdaptiveFitnessPlan(
  user: User,
  preferences: FitnessPreferences,
  nutritionGoal?: NutritionGoal
): Promise<FitnessPlan> {
  try {
    const userId = user.id;
    const conversation = await getUserConversation(userId);
    
    // Get user's weight history for trend analysis
    const weightHistory = await storage.getWeights(userId);
    
    // Get previous workouts to analyze performance
    const previousWorkouts = await storage.getWorkouts(userId);
    const completedWorkouts = previousWorkouts.filter(w => w.completed);
    
    // Format workout data for the prompt
    const workoutData = completedWorkouts.length > 0 
      ? `Previous completed workouts: ${completedWorkouts.map(w => w.name).join(', ')}`
      : "No previous workout data";
    
    // Format weight data for the prompt
    const weightData = weightHistory.length > 0
      ? `Weight trend: Started at ${weightHistory[0].weight}${weightHistory[0].unit}, now at ${weightHistory[weightHistory.length - 1].weight}${weightHistory[weightHistory.length - 1].unit}`
      : "No weight history available";
    
    // Generate an enhanced adaptive prompt
    const adaptivePrompt = `
      I need a personalized fitness and nutrition plan that takes into account my history and progress:
      
      USER PROFILE:
      - Name: ${user.username}
      - Goal: ${preferences.goal}
      - Current weight: ${preferences.currentWeight} ${preferences.unit}
      - Target weight: ${preferences.targetWeight || "Not specified"}
      - Fitness level: ${preferences.fitnessLevel}
      - Workout days: ${preferences.workoutDaysPerWeek} days per week
      - Dietary restrictions: ${preferences.dietaryRestrictions.join(', ') || "None"}
      - Preferred foods: ${preferences.preferredFoods.join(', ') || "No specific preferences"}
      
      USER HISTORY:
      ${weightData}
      ${workoutData}
      
      Based on this information, create an adaptive fitness plan that:
      1. Matches my current fitness level but allows for progression
      2. Addresses any plateaus or challenges based on my data
      3. Creates a nutrition plan that supports my goals
      4. Provides specific, actionable recommendations
      
      IMPORTANT FOR MEAL PLANNING:
      - For MUSCLE GAIN goals: YOU MUST INCLUDE ALL 6 MEAL TYPES daily: breakfast, lunch, dinner, pre_workout, post_workout, and evening_meal
      - For WEIGHT LOSS goals: Include only 3 meals per day (breakfast, lunch, dinner) with 0-1 snacks max
      - For GENERAL FITNESS: Include breakfast, lunch, dinner and 1-2 snacks daily
      
      The plan should adapt based on my progress data.
    `;
    
    // Add the request to the conversation history
    conversation.messages.push({
      role: "user",
      content: adaptivePrompt,
      timestamp: new Date()
    });
    
    // Use existing generateFitnessPlan function from chatbot.ts, but we could
    // enhance this with more adaptive features in the future
    const { generateFitnessPlan } = require('./chatbot');
    const fitnessPlan = await generateFitnessPlan(user, preferences, nutritionGoal);
    
    // Store the plan generation in the conversation history
    let mealFrequencyMessage = "";
    if (preferences.goal.toLowerCase().includes("muscle") || 
        preferences.goal.toLowerCase().includes("gain") || 
        preferences.goal.toLowerCase().includes("bulk")) {
      mealFrequencyMessage = " and 4-6 daily meals including pre/post-workout nutrition";
    } else if (preferences.goal.toLowerCase().includes("weight loss") || 
               preferences.goal.toLowerCase().includes("lose weight") ||
               preferences.goal.toLowerCase().includes("fat loss")) {
      mealFrequencyMessage = " and 2-3 strategically timed meals per day";
    } else {
      mealFrequencyMessage = " and a balanced 3-4 meal approach";
    }
    
    conversation.messages.push({
      role: "assistant",
      content: `I've created a fitness plan for you focused on ${preferences.goal} with ${preferences.workoutDaysPerWeek} workout days per week${mealFrequencyMessage}.`,
      timestamp: new Date()
    });
    
    // Update the context with the new plan
    conversation.context.currentPlanId = fitnessPlan.id;
    
    return fitnessPlan;
  } catch (error) {
    console.error("Error generating adaptive fitness plan:", error);
    throw new Error("Failed to generate adaptive fitness plan");
  }
}

/**
 * Analyzes user progress and provides insights based on their data
 */
export async function analyzeUserProgress(
  userId: number,
  user: User
): Promise<{ insights: string, recommendations: string[] }> {
  try {
    // Get conversation and context for the user
    const conversation = await getUserConversation(userId);
    await refreshUserContext(userId);
    
    // Generate an analysis prompt based on user data
    const analysisPrompt = `
      Analyze my fitness progress and provide insights and recommendations:
      
      ${generateUserContextPrompt(userId, conversation)}
      
      Please provide your analysis in two clear sections:
      1. INSIGHTS: A concise paragraph analyzing my progress
      2. RECOMMENDATIONS: 3-5 specific, actionable recommendations based on my data
      
      Format your response like this:
      
      INSIGHTS:
      [Your analysis here...]
      
      RECOMMENDATIONS:
      1. [First recommendation]
      2. [Second recommendation]
      3. [Third recommendation]
    `;
    
    // Add the analysis request to the conversation history
    conversation.messages.push({
      role: "user",
      content: analysisPrompt,
      timestamp: new Date()
    });
    
    // Optimize message length for API calls
    const MAX_API_MESSAGES = Math.min(8, MAX_MESSAGES_PER_CONVERSATION - 2);
    const recentMessages = conversation.messages.slice(-(MAX_API_MESSAGES));
    
    // Calculate approximate token count (rough estimate) to monitor usage
    const messages = [
      { role: "system" as const, content: getSystemPrompt() },
      ...recentMessages.map(m => ({ 
        role: m.role as "system" | "user" | "assistant", 
        content: m.content 
      }))
    ];
    
    const estimatedTokens = messages.reduce((total, msg) => {
      // Rough estimate: 1 token ≈ 4 characters for English text
      return total + Math.ceil(msg.content.length / 4);
    }, 0);
    
    console.log(`AI Coach Analysis: Estimated input tokens: ${estimatedTokens} for user ${userId}`);
    
    // Generate insights using OpenAI in natural language format
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.5,
      max_tokens: 600
    });
    
    // Log actual token usage when available
    if (response.usage) {
      console.log(`AI Coach Analysis: Actual token usage for user ${userId}: 
        Input tokens: ${response.usage.prompt_tokens}
        Output tokens: ${response.usage.completion_tokens}
        Total tokens: ${response.usage.total_tokens}`);
    }
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }
    
    // Parse the natural language response to extract insights and recommendations
    let insights = "Not enough data to generate insights yet.";
    let recommendations: string[] = ["Continue tracking your progress to get personalized recommendations."];
    
    if (content) {
      // Store the complete analysis in the conversation history
      conversation.messages.push({
        role: "assistant",
        content: content,
        timestamp: new Date()
      });
      
      // Extract insights section
      const insightsMatch = content.match(/INSIGHTS:\s*([^]*?)(?=RECOMMENDATIONS:|$)/i);
      if (insightsMatch && insightsMatch[1]) {
        insights = insightsMatch[1].trim();
      }
      
      // Extract recommendations section
      const recommendationsMatch = content.match(/RECOMMENDATIONS:\s*([^]*?)$/i);
      if (recommendationsMatch && recommendationsMatch[1]) {
        // Split by numbered items (1., 2., 3., etc.)
        const recLines = recommendationsMatch[1].split(/\d+\.\s+/).filter(line => line.trim());
        if (recLines.length > 0) {
          recommendations = recLines.map(line => line.trim());
        }
      }
    }
    
    return {
      insights,
      recommendations
    };
  } catch (error) {
    console.error("Error analyzing user progress:", error);
    return {
      insights: "Unable to analyze progress at this time.",
      recommendations: ["Continue tracking your workouts and meals", "Log your weight regularly to track progress"]
    };
  }
}

/**
 * Provides a progress update for the dashboard
 */
export async function getProgressUpdate(userId: number): Promise<string> {
  try {
    const conversation = await getUserConversation(userId);
    await refreshUserContext(userId);
    
    if (!conversation.context.weightHistory || conversation.context.weightHistory.length < 2) {
      return "Keep logging your workouts and weight to get AI-powered insights!";
    }
    
    // Generate a short progress update
    const updatePrompt = `
      Give me a very brief (max 30 words) progress update based on my data:
      ${generateUserContextPrompt(userId, conversation)}
      
      Make it motivational and specific to my data. No need for json format in this response.
    `;
    
    // Add the request to conversation but don't keep it in history
    const tempMessages = [...conversation.messages, {
      role: "user", 
      content: updatePrompt,
      timestamp: new Date()
    }];
    
    // Optimize message length for API calls
    const MAX_API_MESSAGES = 5; // Keep this one very lightweight
    const recentMessages = tempMessages.slice(-MAX_API_MESSAGES);
    
    // Calculate approximate token count (rough estimate) to monitor usage
    const messages = [
      { role: "system" as const, content: getSystemPrompt() },
      ...recentMessages.map(m => ({ 
        role: m.role as "system" | "user" | "assistant", 
        content: m.content 
      }))
    ];
    
    const estimatedTokens = messages.reduce((total, msg) => {
      // Rough estimate: 1 token ≈ 4 characters for English text
      return total + Math.ceil(msg.content.length / 4);
    }, 0);
    
    console.log(`AI Coach Update: Estimated input tokens: ${estimatedTokens} for user ${userId}`);
    
    // Generate the update
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 60
    });
    
    // Log actual token usage when available
    if (response.usage) {
      console.log(`AI Coach Update: Actual token usage for user ${userId}: 
        Input tokens: ${response.usage.prompt_tokens}
        Output tokens: ${response.usage.completion_tokens}
        Total tokens: ${response.usage.total_tokens}`);
    }
    
    return response.choices[0].message.content || 
      "Keep up the good work! Your AI coach is tracking your progress.";
  } catch (error) {
    console.error("Error generating progress update:", error);
    return "Your AI coach is learning from your workout data.";
  }
}