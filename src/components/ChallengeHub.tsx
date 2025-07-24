import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ChallengeHub() {
  const [activeTab, setActiveTab] = useState("my-challenges");
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [showJoinChallenge, setShowJoinChallenge] = useState(false);
  const [createdChallengeCode, setCreatedChallengeCode] = useState<string | null>(null);

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
        <CreateChallengeModal 
          onClose={() => setShowCreateChallenge(false)} 
          onSuccess={(inviteCode) => {
            setShowCreateChallenge(false);
            setCreatedChallengeCode(inviteCode);
          }}
        />
      )}

      {/* Challenge Created Success Modal */}
      {createdChallengeCode && (
        <ChallengeCreatedModal 
          inviteCode={createdChallengeCode}
          onClose={() => setCreatedChallengeCode(null)}
        />
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

function CreateChallengeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (inviteCode: string) => void }) {
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

      const result = await createChallenge({
        name: formData.name,
        description: formData.description,
        startDate: new Date(formData.startDate).getTime(),
        endDate: new Date(formData.endDate).getTime(),
        isPublic: formData.isPublic,
        dailyTasks: tasks,
      });
      
      toast.success("Challenge created successfully!");
      onSuccess(result.inviteCode);
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const leaderboard = useQuery(api.challenges.getChallengeLeaderboard, { challengeId: challenge._id });
  const todaysProgress = useQuery(api.challenges.getTodaysChallengeProgress, { challengeId: challenge._id });
  const deleteChallenge = useMutation(api.challenges.deleteChallenge);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const isActive = challenge.status === "active";
  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  const now = new Date();
  const isCreator = loggedInUser && challenge.createdBy === loggedInUser._id;
  
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const handleDeleteChallenge = async () => {
    try {
      await deleteChallenge({ challengeId: challenge._id });
      toast.success("Challenge deleted successfully");
      setShowDeleteConfirm(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete challenge");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{challenge.name}</h3>
        <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs rounded-full ${
          challenge.status === "active" ? "bg-green-100 text-green-800" :
          challenge.status === "pending" ? "bg-yellow-100 text-yellow-800" :
          "bg-gray-100 text-gray-800"
        }`}>
          {challenge.status}
        </span>
                     {isCreator && (
             <button
               onClick={() => setShowDeleteConfirm(true)}
               className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
               title="Delete Challenge (Creator Only)"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
               </svg>
             </button>
           )}
           
           {/* Debug indicator - remove later */}
           {isCreator && (
             <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">CREATOR</span>
           )}
        </div>
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

      {/* Invite Link Sharing */}
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-blue-900 text-sm">Share Challenge</p>
            <p className="text-xs text-blue-700">Send this link to invite friends</p>
          </div>
          <button
            onClick={() => {
              const inviteUrl = `${window.location.origin}/invite/${challenge.inviteCode}`;
              navigator.clipboard.writeText(inviteUrl);
              toast.success("Invite link copied to clipboard! 🔗");
            }}
            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Copy Link</span>
          </button>
        </div>
        <div className="mt-2">
          <input
            type="text"
            value={`${window.location.origin}/invite/${challenge.inviteCode}`}
            readOnly
            className="w-full text-xs bg-white border border-blue-200 rounded px-2 py-1 text-gray-600 truncate"
          />
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
        <ChallengeDetails 
          challenge={challenge} 
          leaderboard={leaderboard || []} 
          onDeleteChallenge={isCreator ? () => setShowDeleteConfirm(true) : undefined}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="bg-red-100 rounded-full p-3 inline-block mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Challenge</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete "{challenge.name}"?
              </p>
              <div className="bg-red-50 p-3 rounded-lg mb-4">
                <p className="text-red-800 text-sm">
                  <span className="font-semibold">⚠️ Warning:</span> This action cannot be undone. 
                  All participant progress and data will be permanently deleted.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteChallenge}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChallengeCreatedModal({ inviteCode, onClose }: { inviteCode: string; onClose: () => void }) {
  const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="bg-green-100 rounded-full p-3 inline-block mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Challenge Created! 🎉</h3>
          <p className="text-gray-600">Your challenge is ready. Share the invite link below to get people to join!</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invite Link
          </label>
          <div className="flex">
            <input
              type="text"
              value={inviteUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                toast.success("Link copied! 🔗");
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
        
        <div className="mb-6 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800">
            <span className="font-semibold">💡 Pro tip:</span> Send this link to anyone you want to challenge! 
            They'll see an epic 5-step invite experience before joining.
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function ChallengeDetails({ challenge, leaderboard, onDeleteChallenge }: { 
  challenge: any; 
  leaderboard: any[]; 
  onDeleteChallenge?: () => void;
}) {
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"tasks" | "leaderboard" | "participants">("tasks");
  const updateProgress = useMutation(api.challenges.updateChallengeProgress);
  const removeParticipant = useMutation(api.challenges.removeParticipantFromChallenge);
  const todaysProgress = useQuery(api.challenges.getTodaysChallengeProgress, { challengeId: challenge._id });
  const participants = useQuery(api.challenges.getChallengeParticipants, { challengeId: challenge._id });
  const loggedInUser = useQuery(api.auth.loggedInUser);

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

  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!confirm(`Are you sure you want to remove ${participantName} from this challenge?`)) {
      return;
    }

    console.log('Attempting to remove participant:', {
      challengeId: challenge._id,
      participantId,
      participantName,
      currentUserId: loggedInUser?._id,
      isCreator
    });

    try {
      await removeParticipant({
        challengeId: challenge._id,
        participantId: participantId as any,
      });
      toast.success(`✅ ${participantName} has been removed from the challenge`);
    } catch (error: any) {
      console.error('Remove participant error:', error);
      toast.error(`❌ ${error.message || "Failed to remove participant"}`);
    }
  };

  const isCreator = loggedInUser && challenge.createdBy === loggedInUser._id;
  
  // Debug logging for participant management (remove this later)
  console.log('Debug participant management:', {
    loggedInUserId: loggedInUser?._id,
    challengeCreatedBy: challenge.createdBy,
    isCreator: isCreator,
    challengeName: challenge.name
  });

  return (
    <div className="mt-4 pt-4 border-t">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "tasks"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Daily Tasks
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "leaderboard"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab("participants")}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "participants"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Participants {isCreator && <span className="text-xs">⚙️</span>}
        </button>
      </div>

      <div className="space-y-4">
        {/* Daily Tasks Tab */}
        {activeTab === "tasks" && (
        <div>
            <h4 className="font-medium text-gray-900 mb-4">Daily Tasks</h4>
          <div className="space-y-2">
            {challenge.dailyTasks.map((task: any, index: number) => {
              const taskProgress = todaysProgress?.completedTasks.find((t: any) => t.taskIndex === index);
              return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
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
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && leaderboard && leaderboard.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Leaderboard</h4>
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div key={entry.userId} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="flex items-center space-x-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? "bg-yellow-100 text-yellow-800" :
                      index === 1 ? "bg-gray-100 text-gray-700" :
                      index === 2 ? "bg-orange-100 text-orange-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      #{index + 1}
                    </span>
                    <span className="font-medium">{entry.userName}</span>
                  </span>
                  <span className="font-bold text-blue-600">{entry.totalScore} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

                 {/* Participants Tab */}
         {activeTab === "participants" && (
           <div>
             <div className="flex items-center justify-between mb-4">
               <h4 className="font-medium text-gray-900">Participants</h4>
               {isCreator && (
                 <div className="flex items-center space-x-2">
                   <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded font-semibold">
                     👑 CREATOR MODE ⚙️
                   </span>
                   <button
                     onClick={onDeleteChallenge}
                     className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                   >
                     🗑️ Delete Challenge
                   </button>
                 </div>
               )}
               
               {/* Show debug info if not creator */}
               {!isCreator && loggedInUser && (
                 <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                   Participant View
                 </span>
               )}
             </div>
            <div className="space-y-2">
              {participants?.map((participant) => (
                <div key={participant.userId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      participant.isCreator ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {participant.isCreator ? "👑" : "👤"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{participant.name}</p>
                      <p className="text-xs text-gray-500">{participant.email}</p>
                      {participant.isCreator && (
                        <span className="text-xs text-purple-600 font-medium">Creator</span>
                      )}
                    </div>
                  </div>
                  
                  {isCreator && !participant.isCreator && (
                    <button
                      onClick={() => handleRemoveParticipant(participant.userId, participant.name)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              
              {(!participants || participants.length === 0) && (
                <div className="text-center py-4 text-gray-500">
                  <p>No participants yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
