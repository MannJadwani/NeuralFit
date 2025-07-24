import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ChallengeHub() {
  const [activeTab, setActiveTab] = useState("my-challenges");
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [showJoinChallenge, setShowJoinChallenge] = useState(false);

  const myChallenges = useQuery(api.challenges.getMyChallenges);
  const pendingInvitations = useQuery(api.challenges.getPendingInvitations);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Challenge Hub</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowJoinChallenge(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            Join Challenge
          </button>
          <button
            onClick={() => setShowCreateChallenge(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Challenge
          </button>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations && pendingInvitations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Pending Invitations</h3>
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <InvitationCard key={invitation._id} invitation={invitation} />
            ))}
          </div>
        </div>
      )}

      {/* Create Challenge Modal */}
      {showCreateChallenge && (
        <CreateChallengeModal onClose={() => setShowCreateChallenge(false)} />
      )}

      {/* Join Challenge Modal */}
      {showJoinChallenge && (
        <JoinChallengeModal onClose={() => setShowJoinChallenge(false)} />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("my-challenges")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "my-challenges"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            My Challenges
          </button>
        </nav>
      </div>

      {/* Challenge List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myChallenges?.map((challenge) => (
          <ChallengeCard key={challenge._id} challenge={challenge} />
        ))}
        
        {(!myChallenges || myChallenges.length === 0) && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No challenges yet. Create or join your first challenge!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateChallengeModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    isPublic: false,
    dailyTasks: [{ name: "", description: "", target: "", unit: "" }],
  });

  const createChallenge = useMutation(api.challenges.createChallenge);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const tasks = formData.dailyTasks
        .filter(task => task.name.trim())
        .map(task => ({
          name: task.name,
          description: task.description,
          target: task.target ? parseFloat(task.target) : undefined,
          unit: task.unit || undefined,
        }));

      await createChallenge({
        name: formData.name,
        description: formData.description,
        startDate: new Date(formData.startDate).getTime(),
        endDate: new Date(formData.endDate).getTime(),
        isPublic: formData.isPublic,
        dailyTasks: tasks,
      });
      
      toast.success("Challenge created successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to create challenge");
    }
  };

  const addTask = () => {
    setFormData(prev => ({
      ...prev,
      dailyTasks: [...prev.dailyTasks, { name: "", description: "", target: "", unit: "" }],
    }));
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dailyTasks: prev.dailyTasks.filter((_, i) => i !== index),
    }));
  };

  const updateTask = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      dailyTasks: prev.dailyTasks.map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      ),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Create New Challenge</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Challenge Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700">
              Make this challenge public
            </label>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Daily Tasks
              </label>
              <button
                type="button"
                onClick={addTask}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Task
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.dailyTasks.map((task, index) => (
                <div key={index} className="border rounded-md p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-700">Task {index + 1}</span>
                    {formData.dailyTasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTask(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Task name"
                      value={task.name}
                      onChange={(e) => updateTask(index, "name", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={task.description}
                      onChange={(e) => updateTask(index, "description", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Target (optional)"
                      value={task.target}
                      onChange={(e) => updateTask(index, "target", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Unit (e.g., steps, reps)"
                      value={task.unit}
                      onChange={(e) => updateTask(index, "unit", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Challenge
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinChallengeModal({ onClose }: { onClose: () => void }) {
  const [inviteCode, setInviteCode] = useState("");
  const joinChallenge = useMutation(api.challenges.joinChallengeByCode);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await joinChallenge({ inviteCode: inviteCode.toUpperCase() });
      toast.success("Successfully joined challenge!");
      onClose();
    } catch (error) {
      toast.error("Failed to join challenge. Check the invite code.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Join Challenge</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="Enter 6-character code"
              maxLength={6}
              required
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Join Challenge
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvitationCard({ invitation }: { invitation: any }) {
  const respondToInvitation = useMutation(api.challenges.respondToInvitation);

  const handleResponse = async (accept: boolean) => {
    try {
      await respondToInvitation({
        invitationId: invitation._id,
        accept,
      });
      toast.success(accept ? "Challenge accepted!" : "Invitation declined");
    } catch (error) {
      toast.error("Failed to respond to invitation");
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-md border">
      <div>
        <p className="font-medium">{invitation.challenge.name}</p>
        <p className="text-sm text-gray-600">
          Invited by {invitation.inviterName}
        </p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => handleResponse(false)}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Decline
        </button>
        <button
          onClick={() => handleResponse(true)}
          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

function ChallengeCard({ challenge }: { challenge: any }) {
  const [showDetails, setShowDetails] = useState(false);
  const leaderboard = useQuery(api.challenges.getChallengeLeaderboard, { challengeId: challenge._id });
  const todaysProgress = useQuery(api.challenges.getTodaysChallengeProgress, { challengeId: challenge._id });

  const isActive = challenge.status === "active";
  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  const now = new Date();
  
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{challenge.name}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          challenge.status === "active" ? "bg-green-100 text-green-800" :
          challenge.status === "pending" ? "bg-yellow-100 text-yellow-800" :
          "bg-gray-100 text-gray-800"
        }`}>
          {challenge.status}
        </span>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">{challenge.description}</p>
      
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex justify-between">
          <span>Participants:</span>
          <span>{challenge.participants.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Days left:</span>
          <span>{daysLeft}</span>
        </div>
        <div className="flex justify-between">
          <span>Invite code:</span>
          <span className="font-mono">{challenge.inviteCode}</span>
        </div>
      </div>

      {isActive && todaysProgress && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Today's Progress</p>
          <div className="space-y-1">
            {challenge.dailyTasks.map((task: any, index: number) => {
              const taskProgress = todaysProgress.completedTasks.find((t: any) => t.taskIndex === index);
              return (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>{task.name}</span>
                  <span className={taskProgress?.completed ? "text-green-600" : "text-gray-400"}>
                    {taskProgress?.completed ? "✓" : "○"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        {showDetails ? "Hide Details" : "View Details"}
      </button>

      {showDetails && (
        <ChallengeDetails challenge={challenge} leaderboard={leaderboard || []} />
      )}
    </div>
  );
}

function ChallengeDetails({ challenge, leaderboard }: { challenge: any; leaderboard: any[] }) {
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const updateProgress = useMutation(api.challenges.updateChallengeProgress);
  const todaysProgress = useQuery(api.challenges.getTodaysChallengeProgress, { challengeId: challenge._id });

  const handleTaskToggle = async (taskIndex: number, completed: boolean) => {
    try {
      await updateProgress({
        challengeId: challenge._id,
        date: new Date().toISOString().split('T')[0],
        taskIndex,
        completed,
      });
      toast.success(completed ? "Task completed!" : "Task marked incomplete");
    } catch (error) {
      toast.error("Failed to update progress");
    }
  };

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="space-y-4">
        {/* Daily Tasks */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Daily Tasks</h4>
          <div className="space-y-2">
            {challenge.dailyTasks.map((task: any, index: number) => {
              const taskProgress = todaysProgress?.completedTasks.find((t: any) => t.taskIndex === index);
              return (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium text-sm">{task.name}</p>
                    <p className="text-xs text-gray-600">{task.description}</p>
                    {task.target && (
                      <p className="text-xs text-gray-500">
                        Target: {task.target} {task.unit}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleTaskToggle(index, !taskProgress?.completed)}
                    className={`px-3 py-1 text-sm rounded ${
                      taskProgress?.completed
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {taskProgress?.completed ? "✓ Done" : "Mark Done"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        {leaderboard && leaderboard.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Leaderboard</h4>
            <div className="space-y-1">
              {leaderboard.slice(0, 5).map((entry, index) => (
                <div key={entry.userId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <span className="w-6 text-center font-medium">#{index + 1}</span>
                    <span>{entry.userName}</span>
                  </span>
                  <span className="font-medium">{entry.totalScore} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
