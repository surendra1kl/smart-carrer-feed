import React, { useState, useEffect } from "react";
import { 
  Search, 
  BookOpen, 
  Youtube, 
  Newspaper, 
  TrendingUp, 
  ChevronRight,
  Loader2,
  Sparkles,
  Target,
  Settings,
  ArrowLeft,
  LogIn,
  LogOut,
  User as UserIcon,
  GraduationCap,
  Briefcase,
  Languages,
  Calendar,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Award,
  BookMarked,
  Github,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  auth, 
  signInWithGoogle, 
  logout, 
  onAuthStateChanged, 
  getUserProfile, 
  saveUserProfile,
  User,
  UserProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "./firebase";

interface FeedItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: "News" | "YouTube";
  thumbnail: string;
  publishedAt: string;
}

interface TimetableItem {
  id: string;
  task: string;
  time: string;
  completed: boolean;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  
  // Profile State
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<'Student' | 'Employee' | ''>("");
  const [desiredCourses, setDesiredCourses] = useState<string[]>([]);
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [saveError, setSaveError] = useState("");

  // Feed & Timetable State
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'news' | 'exams' | 'courses' | 'timetable' | 'settings'>('news');
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newTime, setNewTime] = useState("");
  const [dynamicInterests, setDynamicInterests] = useState<string[]>([]);
  const [generatingInterests, setGeneratingInterests] = useState(false);

  const popularGoals = ["AI Engineer", "Full Stack Developer", "Data Scientist", "UI/UX Designer", "Product Manager"];
  const interestOptions = ["Machine Learning", "React", "System Design", "Career Tips", "Open Source", "Soft Skills", "Interview Prep"];
  const languageOptions = ["English", "Hindi", "Telugu", "Spanish", "French", "German", "Mandarin"];

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
          setDisplayName(profile.displayName || "");
          setStatus(profile.status || "");
          setDesiredCourses(profile.desiredCourses || []);
          setPreferredLanguages(profile.preferredLanguages || []);
          setGoal(profile.goal || "");
          setInterests(profile.interests || []);
          setOnboarded(true);
        } else {
          setDisplayName(currentUser.displayName || "");
          setOnboarded(false);
          setOnboardingStep(1);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch feed when onboarded
  useEffect(() => {
    if (onboarded && goal) {
      fetchFeed();
    }
  }, [onboarded, goal, activeTab]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      switch (error.code) {
        case 'auth/operation-not-allowed':
          setAuthError("Email/Password sign-in is not enabled. Please enable it in the Firebase Console.");
          break;
        case 'auth/email-already-in-use':
          setAuthError("This email is already registered. Try logging in instead.");
          break;
        case 'auth/weak-password':
          setAuthError("Password should be at least 6 characters.");
          break;
        case 'auth/invalid-email':
          setAuthError("Please enter a valid email address.");
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setAuthError("Invalid email or password.");
          break;
        default:
          setAuthError(error.message);
      }
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const toggleLanguage = (lang: string) => {
    setPreferredLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const fetchDynamicInterests = async (targetGoal: string) => {
    if (!targetGoal || targetGoal.length < 3) return;
    setGeneratingInterests(true);
    try {
      const res = await fetch('/api/generate-interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: targetGoal })
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.interests) {
        setDynamicInterests(data.interests);
      }
    } catch (error) {
      console.error("Error fetching interests:", error);
    } finally {
      setGeneratingInterests(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (goal) fetchDynamicInterests(goal);
    }, 1000);
    return () => clearTimeout(timer);
  }, [goal]);

  const completeOnboarding = async () => {
    if (user) {
      await saveUserProfile({
        uid: user.uid,
        email: user.email || "",
        displayName,
        status: status as 'Student' | 'Employee',
        desiredCourses,
        preferredLanguages,
        goal,
        interests
      });
    }
    setOnboarded(true);
  };

  const fetchFeed = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    try {
      // We'll simulate different tabs by adding keywords to the query
      const tabQuery = activeTab === 'exams' ? 'exams' : activeTab === 'courses' ? 'courses' : '';
      const query = `${goal} ${interests.join(" ")} ${tabQuery}`.trim();
      const res = await fetch(`/api/feed?goal=${encodeURIComponent(query)}&interests=${encodeURIComponent(interests.join(","))}`);
      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setFeed(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTimetableItem = () => {
    if (!newTask || !newTime) return;
    const item: TimetableItem = {
      id: Math.random().toString(36).substr(2, 9),
      task: newTask,
      time: newTime,
      completed: false
    };
    setTimetable(prev => [...prev, item].sort((a, b) => a.time.localeCompare(b.time)));
    setNewTask("");
    setNewTime("");
  };

  const toggleTask = (id: string) => {
    setTimetable(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const deleteTask = (id: string) => {
    setTimetable(prev => prev.filter(item => item.id !== id));
  };

  const generateAISchedule = async () => {
    setLoading(true);
    try {
      const prompt = `Create a daily study/work schedule for someone aiming to become a ${goal}. 
      They are a ${status}. 
      Interests: ${interests.join(", ")}. 
      Desired courses: ${desiredCourses.join(", ")}.
      Preferred languages: ${preferredLanguages.join(", ")}.
      Return the schedule as a JSON array of objects with "task" and "time" (HH:MM format) keys. 
      Limit to 5-7 key tasks.`;

      const res = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.schedule) {
        setTimetable(data.schedule.map((s: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          task: s.task,
          time: s.time,
          completed: false
        })));
      }
    } catch (error) {
      console.error("Error generating schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full"
        >
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4 text-center">
            {authMode === 'login' ? 'Welcome Back' : 'Join CareerFeed'}
          </h1>
          
          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            {authMode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {authError && <p className="text-red-500 text-xs">{authError}</p>}
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Or continue with</span></div>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 shadow-sm mb-6"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Google
          </button>

          <p className="text-center text-sm text-slate-500">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-indigo-600 font-bold hover:underline"
            >
              {authMode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  if (!onboarded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full"
        >
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (onboardingStep === 1) {
                    if (goal) {
                      setOnboarded(true);
                    } else {
                      logout();
                    }
                  } else if (onboardingStep === 3 && status === 'Employee') {
                    setOnboardingStep(1);
                  } else {
                    setOnboardingStep(prev => prev - 1);
                  }
                }}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors mr-2 group"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 group-hover:text-indigo-600" />
                <span className="text-sm font-bold text-slate-500 group-hover:text-indigo-600">Back</span>
              </button>
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">CareerFeed</span>
              </div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1.5 w-6 rounded-full ${onboardingStep >= i ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {onboardingStep === 1 && (
              <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
                <p className="text-slate-500 mb-6 text-sm">Let's start with the basics.</p>
                
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Current Status</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setStatus('Student')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                          status === 'Student' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <GraduationCap className={`w-6 h-6 ${status === 'Student' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="font-bold text-sm">Student</span>
                      </button>
                      <button
                        onClick={() => setStatus('Employee')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                          status === 'Employee' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <Briefcase className={`w-6 h-6 ${status === 'Employee' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="font-bold text-sm">Employee</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  disabled={!displayName || !status}
                  onClick={() => setOnboardingStep(status === 'Student' ? 2 : 3)}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  Continue
                </button>
              </motion.div>
            )}

            {onboardingStep === 2 && (
              <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <h2 className="text-2xl font-bold mb-2">Student Details</h2>
                <p className="text-slate-500 mb-6 text-sm">Help us understand your learning preferences.</p>
                
                <div className="space-y-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">What courses do you want to learn?</label>
                    <div className="relative">
                      <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Press Enter to add..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value) {
                            setDesiredCourses(prev => [...prev, e.currentTarget.value]);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {desiredCourses.map(c => (
                        <span key={c} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full flex items-center gap-1">
                          {c}
                          <button onClick={() => setDesiredCourses(prev => prev.filter(i => i !== c))}><Plus className="w-3 h-3 rotate-45" /></button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Languages</label>
                    <div className="flex flex-wrap gap-2">
                      {languageOptions.map(l => (
                        <button
                          key={l}
                          onClick={() => toggleLanguage(l)}
                          className={`px-4 py-2 rounded-full border-2 text-xs font-bold transition-all ${
                            preferredLanguages.includes(l) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-white text-slate-600'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setOnboardingStep(3)}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
                >
                  Continue
                </button>
              </motion.div>
            )}

            {onboardingStep === 3 && (
              <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <h2 className="text-2xl font-bold mb-2">Career Goal</h2>
                <p className="text-slate-500 mb-6 text-sm">What do you want to achieve?</p>
                
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {popularGoals.map(g => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className={`p-4 text-left rounded-xl border-2 transition-all ${
                        goal === g ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <span className="font-medium">{g}</span>
                    </button>
                  ))}
                </div>

                <div className="relative mb-8">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Or type a custom goal..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </div>

                <button
                  disabled={!goal}
                  onClick={() => setOnboardingStep(4)}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  Continue
                </button>
              </motion.div>
            )}

            {onboardingStep === 4 && (
              <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <h2 className="text-2xl font-bold mb-2">Interests</h2>
                <p className="text-slate-500 mb-6 text-sm">Tailor your feed with specific topics.</p>
                
                <div className="flex flex-wrap gap-2 mb-8">
                  {generatingInterests ? (
                    <div className="w-full flex items-center justify-center py-8 gap-3 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">Generating relevant interests...</span>
                    </div>
                  ) : dynamicInterests.length > 0 ? (
                    dynamicInterests.map(interest => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                          interests.includes(interest) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-white text-slate-600'
                        }`}
                      >
                        {interest}
                      </button>
                    ))
                  ) : (
                    interestOptions.map(interest => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                          interests.includes(interest) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-white text-slate-600'
                        }`}
                      >
                        {interest}
                      </button>
                    ))
                  )}
                </div>

                <button
                  onClick={completeOnboarding}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
                >
                  Finish Onboarding
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (activeTab !== 'news') {
                  setActiveTab('news');
                } else {
                  setOnboarded(false);
                }
              }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
              title={activeTab !== 'news' ? "Back to News" : "Edit Profile"}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">CareerFeed</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
              <UserIcon className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">{displayName || user.email}</span>
            </div>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Dashboard Navigation */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
              Hello, {(displayName || "").split(" ")[0] || "User"} 👋
            </h1>
            <p className="text-slate-500 font-medium">Your path to <span className="text-indigo-600 font-bold">{goal}</span> starts here.</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            {[
              { id: 'news', icon: Newspaper, label: 'News' },
              { id: 'exams', icon: Award, label: 'Exams' },
              { id: 'courses', icon: BookMarked, label: 'Courses' },
              { id: 'timetable', icon: Calendar, label: 'Schedule' },
              { id: 'settings', icon: Settings, label: 'Settings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'settings' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
          >
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <Settings className="w-6 h-6 text-indigo-600" />
              Profile Settings
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Display Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Career Goal</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g., AI Engineer"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {popularGoals.map(g => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        goal === g ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Your Status</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Student', 'Employee'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s as any)}
                      className={`py-3 rounded-xl border-2 font-bold transition-all ${
                        status === s ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-500'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Interests</label>
                <div className="flex flex-wrap gap-2">
                  {generatingInterests ? (
                    <div className="w-full flex items-center justify-center py-4 gap-3 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-medium">Updating interests for your goal...</span>
                    </div>
                  ) : (dynamicInterests.length > 0 ? dynamicInterests : interestOptions).map(interest => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-full border-2 text-xs font-bold transition-all ${
                        interests.includes(interest) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-white text-slate-600'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={async () => {
                  setSaveError("");
                  if (!displayName.trim() || !goal.trim() || !status) {
                    setSaveError("Please fill in all required fields (Name, Goal, and Status).");
                    return;
                  }
                  setLoading(true);
                  try {
                    await saveUserProfile({
                      uid: user!.uid,
                      email: user!.email || "",
                      displayName,
                      status: status as any,
                      goal,
                      interests,
                      preferredLanguages,
                      desiredCourses
                    });
                    setActiveTab('news');
                  } catch (error) {
                    console.error("Error saving profile:", error);
                    setSaveError("Failed to save profile. Please check your connection and try again.");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Save Profile Changes
              </button>
              {saveError && <p className="text-red-500 text-xs text-center mt-2 font-bold">{saveError}</p>}
            </div>
          </motion.div>
        ) : activeTab === 'timetable' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Today's Schedule
                </h2>
                
                <div className="space-y-3">
                  {timetable.length > 0 ? timetable.map(item => (
                    <motion.div
                      layout
                      key={item.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        item.completed ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <button onClick={() => toggleTask(item.id)}>
                          {item.completed ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-slate-200" />
                          )}
                        </button>
                        <div>
                          <p className={`font-bold ${item.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {item.task}
                          </p>
                          <p className="text-xs text-slate-400 font-medium">{item.time}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteTask(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )) : (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                      <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-medium">No tasks scheduled for today.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-200">
                <h3 className="font-bold text-lg mb-4">Add Task</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-indigo-100 mb-1 uppercase tracking-wider">Task Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:bg-white/20 placeholder:text-indigo-200"
                      placeholder="e.g., Study React Hooks"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-100 mb-1 uppercase tracking-wider">Time</label>
                    <input
                      type="time"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:bg-white/20"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={addTimetableItem}
                    className="w-full py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add to Schedule
                  </button>
                </div>
              </div>

              <button
                onClick={generateAISchedule}
                disabled={loading}
                className="w-full py-6 bg-white border-2 border-indigo-100 rounded-3xl text-indigo-600 font-bold hover:bg-indigo-50 transition-all flex flex-col items-center gap-2 group"
              >
                <div className="bg-indigo-100 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm">Generate AI Schedule</p>
                  <p className="text-[10px] text-slate-400 font-medium">Based on your {goal} goal</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse">
                  <div className="w-full aspect-video bg-slate-100 rounded-xl mb-4" />
                  <div className="h-6 bg-slate-100 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-100 rounded w-full mb-1" />
                </div>
              ))
            ) : feed.length > 0 ? (
              feed.map((item, index) => (
                <motion.a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex flex-col"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={item.thumbnail || `https://picsum.photos/seed/${item.id}/400/225`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                        item.source === 'YouTube' ? 'bg-red-50 text-red-600' : 
                        item.source === 'GitHub' ? 'bg-slate-900 text-white' :
                        item.source === 'Reddit' ? 'bg-orange-50 text-orange-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {item.source === 'YouTube' ? <Youtube className="w-3 h-3" /> : 
                         item.source === 'GitHub' ? <Github className="w-3 h-3" /> :
                         item.source === 'Reddit' ? <MessageSquare className="w-3 h-3" /> :
                         <Newspaper className="w-3 h-3" />}
                        {item.source}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(item.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-1 text-indigo-600 font-bold text-xs">
                        View Details
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </motion.a>
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Finding relevant content...</h3>
                <p className="text-slate-500 max-w-sm mx-auto">We're curating the best {activeTab} for your {goal} journey.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
