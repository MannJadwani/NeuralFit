import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface ChallengeInviteProps {
  inviteCode: string;
  onSignupRequired: (inviteCode: string) => void;
}

type InviteStep = "challenged" | "details" | "dare" | "rejected" | "accepted";

export function ChallengeInvite({ inviteCode, onSignupRequired }: ChallengeInviteProps) {
  const [currentStep, setCurrentStep] = useState<InviteStep>("challenged");
  const [showAnimation, setShowAnimation] = useState(false);
  
  const challenge = useQuery(api.challenges.getChallengeByInviteCode, { inviteCode });

  useEffect(() => {
    setShowAnimation(true);
  }, []);

  if (challenge === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (challenge === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Challenge Not Found</h1>
          <p className="text-gray-600">This invite link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case "challenged":
        return <ChallengedStep challenge={challenge} onNext={() => setCurrentStep("details")} />;
      case "details":
        return <DetailsStep challenge={challenge} onNext={() => setCurrentStep("dare")} onBack={() => setCurrentStep("challenged")} />;
      case "dare":
        return (
          <DareStep 
            challenge={challenge} 
            onAccept={() => setCurrentStep("accepted")} 
            onDecline={() => setCurrentStep("rejected")} 
          />
        );
      case "rejected":
        return <RejectedStep challenge={challenge} onTryAgain={() => setCurrentStep("dare")} />;
      case "accepted":
        return <AcceptedStep challenge={challenge} onSignup={() => onSignupRequired(inviteCode)} />;
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-1000 ${showAnimation ? 'opacity-100' : 'opacity-0'}`}>
      {renderStep()}
    </div>
  );
}

function ChallengedStep({ challenge, onNext }: { challenge: any; onNext: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
      <div className="text-center text-white px-6 max-w-2xl">
        <div className="animate-bounce mb-8">
          <div className="bg-white/20 rounded-full p-6 inline-block">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L3.09 8.26L4 21L12 17L20 21L20.91 8.26L12 2ZM12 4.66L18.08 9.26L17.4 18.5L12 15.34L6.6 18.5L5.92 9.26L12 4.66Z"/>
            </svg>
          </div>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-pulse">
          You have been challenged!
        </h1>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            "{challenge.name}"
          </h2>
          <p className="text-lg opacity-90">
            by {challenge.creatorName}
          </p>
        </div>
        
        <button
          onClick={onNext}
          className="bg-white text-purple-600 px-8 py-4 rounded-full text-xl font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
        >
          See Challenge Details →
        </button>
      </div>
    </div>
  );
}

function DetailsStep({ challenge, onNext, onBack }: { challenge: any; onNext: () => void; onBack: () => void }) {
  const startDate = new Date(challenge.startDate).toLocaleDateString();
  const endDate = new Date(challenge.endDate).toLocaleDateString();
  const duration = Math.ceil((challenge.endDate - challenge.startDate) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-cyan-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="mb-6 text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          ← Back
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Challenge Details
            </h1>
            <div className="w-24 h-1 bg-indigo-600 mx-auto rounded"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="font-semibold text-indigo-900 mb-2">Challenge Name</h3>
                <p className="text-lg">{challenge.name}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Duration</h3>
                <p>{duration} days ({startDate} - {endDate})</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Participants</h3>
                <p>{challenge.participantCount} people already joined</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700">{challenge.description}</p>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Daily Tasks</h3>
            <div className="grid gap-4">
              {challenge.dailyTasks.map((task: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{task.name}</h4>
                      <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                      {task.target && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          Goal: {task.target} {task.unit}
                        </span>
                      )}
                    </div>
                    <div className="bg-indigo-100 rounded-full p-2 ml-4">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={onNext}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full text-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Ready for the Challenge? →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DareStep({ challenge, onAccept, onDecline }: { challenge: any; onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-600 to-red-600">
      <div className="text-center text-white px-6 max-w-2xl">
        <div className="mb-8">
          <div className="bg-white/20 rounded-full p-8 inline-block mb-6">
            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
            </svg>
          </div>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-8 animate-pulse">
          Do you dare to accept?
        </h1>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
          <p className="text-xl mb-4">
            Join {challenge.participantCount} others in the
          </p>
          <h2 className="text-2xl md:text-3xl font-bold">
            "{challenge.name}"
          </h2>
          <p className="text-lg mt-4 opacity-90">
            Challenge created by {challenge.creatorName}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onDecline}
            className="bg-white/20 text-white border-2 border-white px-8 py-4 rounded-full text-xl font-semibold hover:bg-white/30 transition-all duration-200"
          >
            I'm not ready 😅
          </button>
          <button
            onClick={onAccept}
            className="bg-white text-orange-600 px-8 py-4 rounded-full text-xl font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            YES, I ACCEPT! 🔥
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectedStep({ challenge, onTryAgain }: { challenge: any; onTryAgain: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800">
      <div className="text-center text-white px-6 max-w-2xl">
        <div className="mb-8">
          <div className="bg-white/20 rounded-full p-8 inline-block mb-6">
            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M10,8V16L16,12"/>
            </svg>
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Challenge declined? 🤔
        </h1>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
          <p className="text-xl mb-4">
            Come on, don't let {challenge.creatorName} down!
          </p>
          <h2 className="text-2xl font-bold mb-4">
            "{challenge.name}"
          </h2>
          <p className="text-lg opacity-90">
            {challenge.participantCount} brave souls have already joined.
            Will you be next?
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-xl font-semibold animate-pulse">
            Ask again! 💪
          </p>
          <button
            onClick={onTryAgain}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-full text-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Give me another chance! 🔥
          </button>
        </div>
      </div>
    </div>
  );
}

function AcceptedStep({ challenge, onSignup }: { challenge: any; onSignup: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 to-emerald-600">
      <div className="text-center text-white px-6 max-w-2xl">
        <div className="mb-8">
          <div className="bg-white/20 rounded-full p-8 inline-block mb-6 animate-bounce">
            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
            </svg>
          </div>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          AWESOME! 🎉
        </h1>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
          <p className="text-xl mb-4">
            You've accepted the challenge!
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            "{challenge.name}"
          </h2>
          <p className="text-lg opacity-90">
            Now create your account to join {challenge.participantCount} others
            and start crushing those daily goals! 💪
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-lg">
            <span>🔥</span>
            <span>Get ready to level up!</span>
            <span>🔥</span>
          </div>
          <button
            onClick={onSignup}
            className="bg-white text-green-600 px-8 py-4 rounded-full text-xl font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Create Account & Join Challenge →
          </button>
        </div>
      </div>
    </div>
  );
} 