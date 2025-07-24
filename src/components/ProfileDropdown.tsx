import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuthActions();
  
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const profile = useQuery(api.profiles.getProfile);
  const workoutStats = useQuery(api.analytics.getWorkoutStats, { days: 30 });
  const nutritionStats = useQuery(api.analytics.getNutritionStats, { days: 7 });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!loggedInUser) return null;

  const getUserDisplayName = () => {
    if (loggedInUser.name) return loggedInUser.name;
    if (loggedInUser.email) return loggedInUser.email.split('@')[0];
    return "Anonymous User";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatFitnessLevel = (level?: string) => {
    if (!level) return "Not set";
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const formatGoals = (goals?: string[]) => {
    if (!goals || goals.length === 0) return "No goals set";
    return goals.map(goal => goal.replace('_', ' ')).join(', ');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
          {getUserInitials()}
        </div>
        
        {/* Name (hidden on mobile) */}
        <span className="hidden md:block text-sm font-medium text-gray-700">
          {getUserDisplayName()}
        </span>
        
        {/* Dropdown Arrow */}
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-screen max-w-sm sm:w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {getUserInitials()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{getUserDisplayName()}</h3>
                {loggedInUser.email && (
                  <p className="text-sm text-gray-500">{loggedInUser.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Fitness Profile</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Level:</span>
                  <span className="font-medium">{formatFitnessLevel(profile?.fitnessLevel)}</span>
                </div>
                
                {profile?.height && profile?.weight && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Height:</span>
                      <span className="font-medium">{profile.height} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weight:</span>
                      <span className="font-medium">{profile.weight} kg</span>
                    </div>
                  </>
                )}
                
                {profile?.age && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age:</span>
                    <span className="font-medium">{profile.age} years</span>
                  </div>
                )}
              </div>
            </div>

            {/* Goals */}
            {profile?.goals && profile.goals.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Goals</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.goals.map((goal) => (
                    <span 
                      key={goal} 
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      {goal.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Quick Stats</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 p-2 rounded-lg">
                  <div className="text-lg font-bold text-green-700">
                    {workoutStats?.totalWorkouts || 0}
                  </div>
                  <div className="text-xs text-green-600">Workouts (30d)</div>
                </div>
                
                <div className="bg-purple-50 p-2 rounded-lg">
                  <div className="text-lg font-bold text-purple-700">
                    {workoutStats?.consistency || 0}
                  </div>
                  <div className="text-xs text-purple-600">Per week</div>
                </div>
                
                <div className="bg-orange-50 p-2 rounded-lg">
                  <div className="text-lg font-bold text-orange-700">
                    {Math.round((workoutStats?.totalMinutes || 0) / 60)}h
                  </div>
                  <div className="text-xs text-orange-600">Total time</div>
                </div>
                
                <div className="bg-blue-50 p-2 rounded-lg">
                  <div className="text-lg font-bold text-blue-700">
                    {nutritionStats?.avgCalories || 0}
                  </div>
                  <div className="text-xs text-blue-600">Avg calories</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-100 space-y-2">
            <button
              onClick={() => {
                setIsOpen(false);
                // You can add navigation to profile settings here
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              ⚙️ Profile Settings
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false);
                void signOut();
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 