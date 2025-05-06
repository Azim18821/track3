// This script populates the exercise library with a variety of exercises
// categorized by muscle groups, including video demonstrations

import { db } from "./db";
import { exerciseLibrary } from "@shared/schema";

interface ExerciseData {
  name: string;
  description: string;
  muscleGroup: string;
  difficulty: string;
  videoUrl?: string;
  imageUrl?: string;
  instructions: string;
}

const exercises: ExerciseData[] = [
  // CHEST EXERCISES
  {
    name: "Bench Press",
    description: "A compound exercise that works the chest, shoulders, and triceps.",
    muscleGroup: "chest",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
    instructions: "1. Lie on a flat bench with your feet flat on the floor.\n2. Grip the barbell with hands slightly wider than shoulder-width apart.\n3. Lower the bar to your mid-chest.\n4. Press the bar back up to the starting position.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Incline Dumbbell Press",
    description: "This exercise targets the upper portion of the chest muscles.",
    muscleGroup: "chest",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    instructions: "1. Set an adjustable bench to a 30-45 degree incline.\n2. Sit on the bench with a dumbbell in each hand resting on your thighs.\n3. Lift the dumbbells to shoulder height with palms facing forward.\n4. Press the dumbbells up until your arms are extended.\n5. Lower the weights back to shoulder level and repeat."
  },
  {
    name: "Push-ups",
    description: "A bodyweight exercise that works the chest, shoulders, and triceps.",
    muscleGroup: "chest",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4",
    instructions: "1. Start in a plank position with hands slightly wider than shoulder-width apart.\n2. Keep your body in a straight line from head to toe.\n3. Lower your body until your chest nearly touches the floor.\n4. Push yourself back to the starting position.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Cable Fly",
    description: "Isolates the chest muscles through a wide range of motion.",
    muscleGroup: "chest",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=Iwe6AmxVf7o",
    instructions: "1. Stand between two cable machines with handles attached at chest height.\n2. Grab the handles with palms facing forward.\n3. Step forward slightly with a split stance for stability.\n4. With a slight bend in your elbows, bring your hands together in front of your chest.\n5. Slowly return to the starting position and repeat."
  },
  {
    name: "Decline Push-up",
    description: "A variation of the push-up that emphasizes the lower chest.",
    muscleGroup: "chest",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=SKPab1YVuQo",
    instructions: "1. Place your feet on an elevated surface like a bench or step.\n2. Position your hands on the floor slightly wider than shoulder-width apart.\n3. Keep your body in a straight line from head to heels.\n4. Lower your chest toward the floor.\n5. Push back up to the starting position and repeat."
  },

  // BACK EXERCISES
  {
    name: "Pull-ups",
    description: "A bodyweight exercise that targets the back and biceps.",
    muscleGroup: "back",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g",
    instructions: "1. Grip a pull-up bar with hands slightly wider than shoulder-width apart.\n2. Hang with arms fully extended and feet off the floor.\n3. Pull yourself up until your chin is over the bar.\n4. Lower yourself back to the starting position with control.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Bent-Over Rows",
    description: "A compound exercise that works the middle back, lats, and biceps.",
    muscleGroup: "back",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=FWJE3JYppSE",
    instructions: "1. Stand with feet shoulder-width apart, holding a barbell or dumbbells.\n2. Bend at the hips and knees, keeping your back straight and nearly parallel to the floor.\n3. Pull the weight toward your lower ribs, keeping elbows close to your body.\n4. Lower the weight back to the starting position with control.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Lat Pulldown",
    description: "Targets the latissimus dorsi (lats) muscles of the back.",
    muscleGroup: "back",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
    instructions: "1. Sit at a lat pulldown machine with thighs secured under the pads.\n2. Grab the bar with a wide grip, palms facing forward.\n3. Pull the bar down to your upper chest while keeping your back slightly arched.\n4. Slowly return the bar to the starting position.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Deadlift",
    description: "A compound exercise that works multiple muscle groups including the back.",
    muscleGroup: "back",
    difficulty: "advanced",
    videoUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q",
    instructions: "1. Stand with feet hip-width apart, barbell over your mid-foot.\n2. Bend at the hips and knees to lower your hands to the bar, keeping your back straight.\n3. Grip the bar with hands just outside your legs.\n4. Drive through your heels to stand up, keeping the bar close to your body.\n5. Return the weight to the floor with control and repeat."
  },
  {
    name: "Single-Arm Dumbbell Row",
    description: "Works one side of the back at a time for better focus and balance.",
    muscleGroup: "back",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=pYcpY20QaE8",
    instructions: "1. Place your right knee and right hand on a bench for support.\n2. Hold a dumbbell in your left hand, arm extended toward the floor.\n3. Pull the dumbbell up toward your hip, keeping your elbow close to your body.\n4. Lower the dumbbell back to the starting position.\n5. Complete all reps on one side before switching to the other."
  },

  // LEGS EXERCISES
  {
    name: "Squat",
    description: "A compound exercise that works the quadriceps, hamstrings, and glutes.",
    muscleGroup: "legs",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8",
    instructions: "1. Stand with feet shoulder-width apart, toes slightly turned out.\n2. Keep your chest up and back straight.\n3. Bend at the knees and hips to lower your body as if sitting in a chair.\n4. Lower until thighs are parallel to the ground (or as low as you can with proper form).\n5. Push through your heels to return to the starting position."
  },
  {
    name: "Lunges",
    description: "Works the quadriceps, hamstrings, and glutes while improving balance.",
    muscleGroup: "legs",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=QOVaHwm-Q6U",
    instructions: "1. Stand with feet hip-width apart.\n2. Take a step forward with your right foot.\n3. Lower your body until both knees are bent at 90-degree angles.\n4. Push off the front foot to return to the starting position.\n5. Repeat with the other leg and continue alternating."
  },
  {
    name: "Romanian Deadlift",
    description: "Targets the hamstrings and glutes while improving hip mobility.",
    muscleGroup: "legs",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=JCXUYuzwNrM",
    instructions: "1. Stand with feet hip-width apart, holding a barbell or dumbbells in front of your thighs.\n2. Keep your back straight and shoulders back.\n3. Hinge at the hips, pushing your buttocks back while lowering the weight.\n4. Lower until you feel a stretch in your hamstrings, keeping a slight bend in your knees.\n5. Return to the starting position by driving your hips forward."
  },
  {
    name: "Leg Press",
    description: "A machine exercise that targets the quadriceps, hamstrings, and glutes.",
    muscleGroup: "legs",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
    instructions: "1. Sit on the leg press machine with your back against the pad.\n2. Place your feet on the platform at shoulder-width apart.\n3. Release the safety catches and lower the platform by bending your knees.\n4. Push through your heels to extend your legs without locking your knees.\n5. Lower the platform back down and repeat."
  },
  {
    name: "Calf Raises",
    description: "Isolates and strengthens the calf muscles.",
    muscleGroup: "legs",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=gwLzBJYoWlI",
    instructions: "1. Stand on the edge of a step or platform with your heels hanging off.\n2. Balance on the balls of your feet.\n3. Raise your heels as high as possible, contracting your calves.\n4. Lower your heels below the level of the step to feel a stretch in your calves.\n5. Repeat for the desired number of repetitions."
  },

  // SHOULDERS EXERCISES
  {
    name: "Overhead Press",
    description: "A compound exercise that works all three heads of the shoulder.",
    muscleGroup: "shoulders",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=2yjwXTZQDDI",
    instructions: "1. Stand with feet shoulder-width apart, holding a barbell at shoulder height.\n2. Keep your core tight and back straight.\n3. Press the weight overhead until your arms are fully extended.\n4. Lower the weight back to shoulder level with control.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Lateral Raises",
    description: "Isolates the lateral deltoids to build shoulder width.",
    muscleGroup: "shoulders",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
    instructions: "1. Stand with feet shoulder-width apart, holding dumbbells at your sides.\n2. Keep a slight bend in your elbows.\n3. Raise the dumbbells out to the sides until they reach shoulder height.\n4. Lower the weights back to your sides with control.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Front Raises",
    description: "Targets the anterior (front) deltoids.",
    muscleGroup: "shoulders",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=sOcYlBI85hc",
    instructions: "1. Stand with feet shoulder-width apart, holding dumbbells in front of your thighs.\n2. Keep your back straight and core engaged.\n3. Raise the dumbbells in front of you to shoulder height, keeping a slight bend in the elbows.\n4. Lower the weights back to the starting position with control.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Reverse Fly",
    description: "Works the posterior (rear) deltoids and upper back.",
    muscleGroup: "shoulders",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=JoCRRBrQlXc",
    instructions: "1. Sit on a bench with a slight forward lean, holding dumbbells beneath your shoulders.\n2. Keep your back flat and a slight bend in your elbows.\n3. Raise the dumbbells out to the sides and slightly back, squeezing your shoulder blades together.\n4. Lower the weights back to the starting position with control.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Arnold Press",
    description: "A variation of the shoulder press that works all three deltoid heads.",
    muscleGroup: "shoulders",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=6Z15_WdXmVw",
    instructions: "1. Sit on a bench with back support, holding dumbbells at shoulder height with palms facing you.\n2. Press the dumbbells overhead while rotating your palms to face forward.\n3. At the top, your arms should be fully extended with palms facing forward.\n4. Lower the weights while rotating your palms back to face you.\n5. Return to the starting position and repeat."
  },

  // ARMS EXERCISES
  {
    name: "Bicep Curls",
    description: "A classic exercise that isolates the biceps.",
    muscleGroup: "arms",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo",
    instructions: "1. Stand with feet shoulder-width apart, holding dumbbells at your sides.\n2. Keep your elbows close to your sides.\n3. Curl the weights toward your shoulders by bending at the elbow.\n4. Squeeze your biceps at the top of the movement.\n5. Lower the weights back to the starting position and repeat."
  },
  {
    name: "Tricep Dips",
    description: "A bodyweight exercise that targets the triceps.",
    muscleGroup: "arms",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=6kALZikXxLc",
    instructions: "1. Sit on the edge of a bench or chair with your hands beside your hips.\n2. Slide your buttocks off the bench with your legs extended in front of you.\n3. Lower your body by bending your elbows until they reach about 90 degrees.\n4. Push yourself back up to the starting position by straightening your arms.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Skull Crushers",
    description: "Isolates the triceps by extending the elbows.",
    muscleGroup: "arms",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=d_KZxkY_0cM",
    instructions: "1. Lie on a bench holding a barbell or dumbbells with arms extended above your chest.\n2. Keep your upper arms stationary and perpendicular to the floor.\n3. Bend at the elbows to lower the weight toward your forehead.\n4. Extend your arms back to the starting position.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Hammer Curls",
    description: "A variation of bicep curls that also works the brachialis muscle.",
    muscleGroup: "arms",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=zC3nLlEvin4",
    instructions: "1. Stand with feet shoulder-width apart, holding dumbbells at your sides with palms facing in.\n2. Keep your elbows close to your sides.\n3. Curl the weights toward your shoulders while maintaining the neutral grip (palms facing each other).\n4. Lower the weights back to the starting position with control.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Tricep Pushdown",
    description: "Isolates the triceps using a cable machine.",
    muscleGroup: "arms",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU",
    instructions: "1. Stand in front of a cable machine with a rope or bar attachment at head height.\n2. Grip the attachment with palms facing down.\n3. Keep your elbows close to your sides and your upper arms stationary.\n4. Push the attachment down by extending your elbows until your arms are straight.\n5. Slowly return to the starting position and repeat."
  },

  // CORE EXERCISES
  {
    name: "Plank",
    description: "A static exercise that strengthens the core, shoulders, and back.",
    muscleGroup: "core",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=pSHjTRCQxIw",
    instructions: "1. Start in a push-up position, then bend your elbows and rest your weight on your forearms.\n2. Keep your body in a straight line from head to heels.\n3. Engage your core and keep your hips from sagging or lifting.\n4. Hold this position for the desired amount of time.\n5. Breathe normally throughout the exercise."
  },
  {
    name: "Russian Twists",
    description: "Works the obliques and improves rotational core strength.",
    muscleGroup: "core",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=wkD8rjkodUI",
    instructions: "1. Sit on the floor with knees bent and feet slightly elevated.\n2. Lean back slightly to engage your core, keeping your back straight.\n3. Hold your hands together or hold a weight in front of your chest.\n4. Twist your torso to the right, then to the left, touching the floor on each side if possible.\n5. Continue alternating sides for the desired number of repetitions."
  },
  {
    name: "Bicycle Crunches",
    description: "Targets the rectus abdominis and obliques in a dynamic movement.",
    muscleGroup: "core",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=9FGilxCbdz8",
    instructions: "1. Lie on your back with hands behind your head and knees bent.\n2. Lift your shoulders off the ground and bring your right elbow toward your left knee while extending your right leg.\n3. Switch sides, bringing your left elbow toward your right knee while extending your left leg.\n4. Continue alternating in a pedaling motion.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Hanging Leg Raises",
    description: "Works the lower abs and hip flexors.",
    muscleGroup: "core",
    difficulty: "advanced",
    videoUrl: "https://www.youtube.com/watch?v=hdng3Nm1x_E",
    instructions: "1. Hang from a pull-up bar with arms fully extended.\n2. Keep your back straight and shoulders engaged.\n3. Raise your legs in front of you until they're parallel to the floor (or higher if possible).\n4. Lower your legs back down with control.\n5. Repeat for the desired number of repetitions."
  },
  {
    name: "Dead Bug",
    description: "A safe core exercise that helps maintain proper spine alignment.",
    muscleGroup: "core",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=4XLEnwUr1d8",
    instructions: "1. Lie on your back with arms extended toward the ceiling and knees bent at 90 degrees.\n2. Slowly lower your right arm behind your head while extending your left leg straight.\n3. Return to the starting position.\n4. Repeat with the left arm and right leg.\n5. Continue alternating sides for the desired number of repetitions."
  },

  // FULL BODY EXERCISES
  {
    name: "Burpees",
    description: "A high-intensity exercise that works multiple muscle groups and elevates heart rate.",
    muscleGroup: "full body",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=dZgVxmf6jkA",
    instructions: "1. Start in a standing position with feet shoulder-width apart.\n2. Squat down and place your hands on the floor in front of you.\n3. Jump your feet back to a plank position.\n4. Perform a push-up (optional).\n5. Jump your feet back to your hands, then explosively jump up with arms overhead."
  },
  {
    name: "Mountain Climbers",
    description: "A dynamic exercise that works the core, shoulders, and legs while raising heart rate.",
    muscleGroup: "full body",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=nmwgirgXLYM",
    instructions: "1. Start in a plank position with hands directly under shoulders.\n2. Keep your core engaged and back flat.\n3. Bring your right knee toward your chest, then quickly switch legs.\n4. Continue alternating legs in a running motion.\n5. Maintain a steady pace for the desired duration."
  },
  {
    name: "Kettlebell Swing",
    description: "A dynamic exercise that works the posterior chain and provides cardiovascular benefits.",
    muscleGroup: "full body",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=YSxHifyI6s8",
    instructions: "1. Stand with feet slightly wider than shoulder-width apart, kettlebell on the floor in front of you.\n2. Hinge at the hips to grab the kettlebell with both hands.\n3. Swing the kettlebell back between your legs, then thrust your hips forward to swing it up to chest height.\n4. Let the kettlebell naturally fall back down between your legs.\n5. Continue swinging for the desired number of repetitions."
  },
  {
    name: "Thruster",
    description: "Combines a front squat with an overhead press for a full-body workout.",
    muscleGroup: "full body",
    difficulty: "advanced",
    videoUrl: "https://www.youtube.com/watch?v=aea5BGj9a8Y",
    instructions: "1. Hold a barbell or dumbbells at shoulder height, elbows bent and palms facing forward.\n2. Squat down until thighs are parallel to the ground.\n3. As you stand back up, press the weight overhead until arms are fully extended.\n4. Lower the weight back to shoulder height as you squat down again.\n5. Continue this fluid motion for the desired number of repetitions."
  },
  {
    name: "Turkish Get-Up",
    description: "A complex movement that builds total-body strength, stability, and mobility.",
    muscleGroup: "full body",
    difficulty: "advanced",
    videoUrl: "https://www.youtube.com/watch?v=jFK8FOiLa_M",
    instructions: "1. Lie on your back holding a kettlebell or dumbbell in your right hand, arm extended toward the ceiling.\n2. Bend your right knee and place your left arm at a 45-degree angle on the floor.\n3. Roll onto your left elbow while keeping your right arm extended.\n4. Push up onto your left hand, then sweep your left leg back to kneel on it.\n5. Stand up while keeping the weight overhead, then reverse the movement to return to the starting position."
  },

  // CARDIO EXERCISES
  {
    name: "Jumping Jacks",
    description: "A classic cardio exercise that elevates heart rate and works the whole body.",
    muscleGroup: "cardio",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=c4DAnQ6DtF8",
    instructions: "1. Stand with feet together and arms at your sides.\n2. Jump up, spreading your feet wider than shoulder-width apart while raising your arms overhead.\n3. Jump again, bringing your feet back together and arms back to your sides.\n4. Continue at a brisk pace for the desired duration.\n5. Maintain a steady rhythm and breathe normally."
  },
  {
    name: "High Knees",
    description: "A cardio drill that works the legs and core while raising heart rate.",
    muscleGroup: "cardio",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=tx5rgpd5p_A",
    instructions: "1. Stand with feet hip-width apart.\n2. Run in place, bringing your knees up toward your chest as high as possible.\n3. Keep your back straight and core engaged.\n4. Pump your arms to increase intensity.\n5. Continue at a rapid pace for the desired duration."
  },
  {
    name: "Jump Rope",
    description: "A classic cardio exercise that improves coordination and endurance.",
    muscleGroup: "cardio",
    difficulty: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=FJmRQ5iTXKE",
    instructions: "1. Hold the jump rope handles with one in each hand.\n2. Swing the rope over your head and jump over it as it reaches your feet.\n3. Keep your jumps small and land softly on the balls of your feet.\n4. Maintain a steady rhythm and jump just high enough to clear the rope.\n5. Continue for the desired duration."
  },
  {
    name: "Jumping Lunges",
    description: "A plyometric exercise that works the legs while raising heart rate.",
    muscleGroup: "cardio",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=hTdcOG9muQk",
    instructions: "1. Start in a lunge position with right foot forward and left foot back.\n2. Lower into the lunge, then explosively jump up.\n3. Switch legs in mid-air, landing with left foot forward and right foot back.\n4. Immediately lower into the next lunge.\n5. Continue alternating legs for the desired number of repetitions."
  },
  {
    name: "Box Jumps",
    description: "A plyometric exercise that builds explosive power and raises heart rate.",
    muscleGroup: "cardio",
    difficulty: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=52r_Ul5k03g",
    instructions: "1. Stand facing a sturdy box or platform.\n2. Squat slightly, then explosively jump onto the box.\n3. Land softly with both feet completely on the box, knees slightly bent.\n4. Step back down to the starting position.\n5. Repeat for the desired number of repetitions."
  }
];

async function populateExerciseLibrary() {
  console.log("Starting to populate exercise library...");
  
  try {
    // Get count of existing exercises to avoid duplicating them
    const existingExercises = await db.select().from(exerciseLibrary);
    
    if (existingExercises.length > 0) {
      console.log(`Exercise library already contains ${existingExercises.length} exercises. Aborting population.`);
      return;
    }
    
    // Insert exercises
    const result = await db.insert(exerciseLibrary).values(exercises);
    
    console.log(`Successfully added ${exercises.length} exercises to the library.`);
  } catch (error) {
    console.error("Error populating exercise library:", error);
  }
}

// Execute the function
populateExerciseLibrary().then(() => {
  console.log("Exercise library population script completed.");
  process.exit(0);
}).catch(error => {
  console.error("Failed to run population script:", error);
  process.exit(1);
});