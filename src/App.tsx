import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { ProfileDropdown } from "./components/ProfileDropdown";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";
import { Dashboard } from "./components/Dashboard";
import { WorkoutTracker } from "./components/WorkoutTracker";
import { NutritionTracker } from "./components/NutritionTracker";
import { ChallengeHub } from "./components/ChallengeHub";
import { ProfileSetup } from "./components/ProfileSetup";
import { ChallengeInvite } from "./components/ChallengeInvite";
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/invite/:inviteCode" element={<InvitePage />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </Router>
  );
}

function InvitePage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);

  const handleSignupRequired = (code: string) => {
    setPendingInviteCode(code);
    navigate("/?challenge=" + code);
  };

  if (!inviteCode) {
    return <div>Invalid invite link</div>;
  }

  return (
    <div>
      <ChallengeInvite 
        inviteCode={inviteCode} 
        onSignupRequired={handleSignupRequired}
      />
      <Toaster />
    </div>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check for pending challenge invite from URL
  const urlParams = new URLSearchParams(window.location.search);
  const challengeInviteCode = urlParams.get("challenge");

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "workouts", label: "Workouts" },
    { id: "nutrition", label: "Nutrition" },
    { id: "challenges", label: "Challenges" },
  ];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false); // Close mobile menu when tab is selected
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-blue-600">NeuralFit</h1>
            <Authenticated>
              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-6">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </Authenticated>
          </div>
          
          <div className="flex items-center space-x-4">
            <Authenticated>
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Toggle menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </Authenticated>
            <ProfileDropdown />
          </div>
        </div>
        
        <Authenticated>
          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-white">
              <nav className="px-4 py-2 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      activeTab === item.id
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </Authenticated>
      </header>

      <main className="flex-1">
        <Content 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          challengeInviteCode={challengeInviteCode}
        />
      </main>
      
      <Toaster />
    </div>
  );
}

function Content({ activeTab, setActiveTab, challengeInviteCode }: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  challengeInviteCode: string | null;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const profile = useQuery(api.profiles.getProfile);
  const joinChallengeAfterSignup = useMutation(api.challenges.joinChallengeAfterSignup);
  const [hasTriedJoiningChallenge, setHasTriedJoiningChallenge] = useState(false);

  // Auto-join challenge after authentication
  useEffect(() => {
    if (loggedInUser && challengeInviteCode && !hasTriedJoiningChallenge) {
      setHasTriedJoiningChallenge(true);
      
      // Add a small delay to ensure auth is fully established
      setTimeout(async () => {
        try {
          await joinChallengeAfterSignup({ inviteCode: challengeInviteCode });
          toast.success("Successfully joined the challenge! 🎉");
          setActiveTab("challenges");
        } catch (error) {
          console.error("Failed to join challenge:", error);
          toast.error("Welcome! But couldn't join the challenge - please try using the invite code manually.");
        }
      }, 1000);
    }
  }, [loggedInUser, challengeInviteCode, hasTriedJoiningChallenge, joinChallengeAfterSignup, setActiveTab]);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            {challengeInviteCode ? (
              <>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Join the Challenge! 🔥
                </h2>
                <p className="text-xl text-gray-600">
                  Create your account to accept the challenge
                </p>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Your AI Personal Trainer
                </h2>
                <p className="text-xl text-gray-600">
                  Track workouts, nutrition, and compete with friends
                </p>
              </>
            )}
          </div>
          <SignInForm challengeInviteCode={challengeInviteCode} />
        </div>
      </Unauthenticated>

      <Authenticated>
        {!profile && activeTab === "dashboard" ? (
          <ProfileSetup onComplete={() => setActiveTab("dashboard")} />
        ) : (
          <>
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "workouts" && <WorkoutTracker />}
            {activeTab === "nutrition" && <NutritionTracker />}
            {activeTab === "challenges" && <ChallengeHub />}
          </>
        )}
      </Authenticated>
    </div>
  );
}
