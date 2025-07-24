import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function WorkoutTracker() {
  const [activeTab, setActiveTab] = useState("plans");
  const [showGenerator, setShowGenerator] = useState(false);
  
  const workoutPlans = useQuery(api.workouts.getWorkoutPlans);
  const activeSession = useQuery(api.workouts.getActiveWorkoutSession);
  const recentSessions = useQuery(api.workouts.getWorkoutSessions, { limit: 5 });
  const profile = useQuery(api.profiles.getProfile);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Workout Tracker</h2>
        <button
          onClick={() => setShowGenerator(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Generate AI Workout
        </button>
      </div>

      {/* Active Workout Session */}
      {activeSession && (
        <ActiveWorkoutSession session={activeSession} />
      )}

      {/* AI Workout Generator Modal */}
      {showGenerator && (
        <WorkoutGenerator 
          profile={profile}
          onClose={() => setShowGenerator(false)}
        />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("plans")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "plans"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Workout Plans
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "history"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Workout History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "plans" && (
        <WorkoutPlans plans={workoutPlans || []} />
      )}
      
      {activeTab === "history" && (
        <WorkoutHistory sessions={recentSessions || []} />
      )}
    </div>
  );
}

function WorkoutGenerator({ profile, onClose }: { profile: any; onClose: () => void }) {
  const [formData, setFormData] = useState({
    duration: 30,
    goals: profile?.goals || [],
    equipment: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generateWorkout = useAction(api.workouts.generateWorkoutPlan);

  const handleGenerate = async () => {
    if (!profile?.fitnessLevel) {
      toast.error("Please complete your profile first");
      return;
    }

    setIsGenerating(true);
    try {
      await generateWorkout({
        fitnessLevel: profile.fitnessLevel,
        goals: formData.goals,
        duration: formData.duration,
        equipment: formData.equipment || undefined,
      });
      
      toast.success("Workout plan generated successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to generate workout plan");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Generate AI Workout</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workout Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="15"
              max="120"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Equipment (optional)
            </label>
            <input
              type="text"
              value={formData.equipment}
              onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., dumbbells, resistance bands"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkoutPlans({ plans }: { plans: any[] }) {
  const startWorkout = useMutation(api.workouts.startWorkoutSession);

  const handleStartWorkout = async (plan: any) => {
    try {
      await startWorkout({
        planId: plan._id,
        name: plan.name,
      });
      toast.success("Workout started!");
    } catch (error) {
      toast.error("Failed to start workout");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <div key={plan._id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${
              plan.difficulty === "beginner" ? "bg-green-100 text-green-800" :
              plan.difficulty === "intermediate" ? "bg-yellow-100 text-yellow-800" :
              "bg-red-100 text-red-800"
            }`}>
              {plan.difficulty}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
          
          <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
            <span>{plan.duration} min</span>
            <span>{plan.exercises.length} exercises</span>
          </div>

          <button
            onClick={() => handleStartWorkout(plan)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Workout
          </button>
        </div>
      ))}
      
      {plans.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500">No workout plans yet. Generate your first AI workout!</p>
        </div>
      )}
    </div>
  );
}

function WorkoutHistory({ sessions }: { sessions: any[] }) {
  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <div key={session._id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{session.name}</h3>
            <span className="text-sm text-gray-500">
              {new Date(session.startTime).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              Duration: {session.endTime 
                ? Math.round((session.endTime - session.startTime) / (1000 * 60)) + " min"
                : "In progress"
              }
            </span>
            <span>{session.exercises.length} exercises</span>
          </div>
        </div>
      ))}
      
      {sessions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No workout history yet. Complete your first workout!</p>
        </div>
      )}
    </div>
  );
}

function ActiveWorkoutSession({ session }: { session: any }) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const updateSession = useMutation(api.workouts.updateWorkoutSession);
  const exercises = useQuery(api.exercises.listExercises, {});

  const handleCompleteSet = async (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...session.exercises];
    updatedExercises[exerciseIndex].sets[setIndex].completed = true;

    try {
      await updateSession({
        sessionId: session._id,
        exercises: updatedExercises,
      });
      
      // Start rest timer if configured
      const exercise = exercises?.find(e => e._id === session.exercises[exerciseIndex].exerciseId);
      if (exercise) {
        setIsResting(true);
        setRestTimer(60); // Default 60 seconds rest
        
        const timer = setInterval(() => {
          setRestTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setIsResting(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      toast.error("Failed to update workout");
    }
  };

  const handleFinishWorkout = async () => {
    try {
      await updateSession({
        sessionId: session._id,
        endTime: Date.now(),
      });
      toast.success("Workout completed!");
    } catch (error) {
      toast.error("Failed to finish workout");
    }
  };

  const currentExercise = session.exercises[currentExerciseIndex];
  const exerciseData = exercises?.find(e => e._id === currentExercise?.exerciseId);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Active Workout: {session.name}</h3>
        <button
          onClick={handleFinishWorkout}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          Finish Workout
        </button>
      </div>

      {isResting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
          <p className="text-blue-800 font-medium">Rest Time</p>
          <p className="text-3xl font-bold text-blue-600">{restTimer}s</p>
        </div>
      )}

      {exerciseData && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-medium text-gray-900">{exerciseData.name}</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
                disabled={currentExerciseIndex === 0}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentExerciseIndex(Math.min(session.exercises.length - 1, currentExerciseIndex + 1))}
                disabled={currentExerciseIndex === session.exercises.length - 1}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Instructions:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {exerciseData.instructions.map((instruction, index) => (
                  <li key={index}>• {instruction}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Sets:</p>
              <div className="space-y-2">
                {currentExercise.sets.map((set: any, setIndex: number) => (
                  <div key={setIndex} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">
                      Set {setIndex + 1}: {set.reps ? `${set.reps} reps` : `${set.duration}s`}
                      {set.weight && ` @ ${set.weight}kg`}
                    </span>
                    <button
                      onClick={() => handleCompleteSet(currentExerciseIndex, setIndex)}
                      disabled={set.completed}
                      className={`px-3 py-1 text-sm rounded ${
                        set.completed
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {set.completed ? "✓ Done" : "Complete"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
