import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru, enUS, ar } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../src/app/components/ui/tabs";
import { Input } from "../../src/app/components/ui/input";
import { Button } from "../../src/app/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../src/app/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../src/app/components/ui/card";
import { Label } from "../../src/app/components/ui/label";
import {
  Bell, Calendar, User, Gift, LogOut, Camera, Plus, Loader2, XCircle,
  Sparkles, Trophy, Crown, Zap, Heart, Star, TrendingUp, Award,
  Clock, MapPin, Phone, Mail, Cake, Edit, Check, X, ChevronRight,
  Target, Flame, Scissors, Droplet, Palette, Settings, ShoppingBag
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../src/app/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../src/app/components/ui/dialog";
import { UserBookingWizard } from './UserBookingWizard';
import { Progress } from "../../src/app/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../src/app/components/ui/select";

interface Booking {
  id: number;
  service_name: string;
  start_time: string;
  status: string;
  master_name?: string;
  price?: number;
  phone?: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface LoyaltyInfo {
  points: number;
  level: string;
  history: any[];
}

// Character System Types
interface CharacterState {
  hair: number; // 0-100
  skin: number;
  nails: number;
  energy: number;
  lastVisit?: string;
  outfit: string;
  gender: 'male' | 'female' | 'neutral';
  age: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export const AccountPage = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['account', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo>({ points: 0, level: 'Bronze', history: [] });
  
  const isBooking = searchParams.get('booking') === 'true';
  const openBooking = () => setSearchParams({ booking: 'true' });
  const closeBooking = () => setSearchParams({});

  const currentUser = user as any;

  // Character State
  const [character, setCharacter] = useState<CharacterState>({
    hair: 85,
    skin: 90,
    nails: 80,
    energy: 75,
    outfit: 'casual',
    gender: 'neutral',
    age: 25
  });

  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: 'first_visit', title: 'First Steps', description: 'Complete your first booking', icon: Star, unlocked: false, progress: 0, maxProgress: 1 },
    { id: 'regular', title: 'Regular Client', description: 'Visit 5 times', icon: Heart, unlocked: false, progress: 0, maxProgress: 5 },
    { id: 'beauty_guru', title: 'Beauty Guru', description: 'Try 10 different services', icon: Sparkles, unlocked: false, progress: 0, maxProgress: 10 },
    { id: 'loyal', title: 'Loyal Customer', description: 'Earn 1000 points', icon: Crown, unlocked: false, progress: 0, maxProgress: 1000 },
    { id: 'streak', title: 'On Fire!', description: 'Visit 3 months in a row', icon: Flame, unlocked: false, progress: 0, maxProgress: 3 },
  ]);

  const [showCharacterEditor, setShowCharacterEditor] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    birth_date: '',
    gender: '',
    new_password: '',
    notification_preferences: {
      sms: true,
      email: true,
      push: true
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bookingToCancel, setBookingToCancel] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      setProfileForm(prev => ({
        ...prev,
        name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        birth_date: currentUser.birthday || currentUser.birth_date || '',
        gender: currentUser.gender || 'neutral',
      }));

      // Load character from localStorage or init
      const savedChar = localStorage.getItem(`character_${user.id}`);
      if (savedChar) {
        setCharacter(JSON.parse(savedChar));
      }
    }
  }, [user, navigate, authLoading]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Save character to localStorage when changed
  useEffect(() => {
    if (user) {
      localStorage.setItem(`character_${user.id}`, JSON.stringify(character));
    }
  }, [character, user]);

  // Update character based on service history
  useEffect(() => {
    if (bookings.length > 0) {
      updateCharacterFromBookings();
      updateAchievements();
    }
  }, [bookings]);

  const updateCharacterFromBookings = () => {
    const completedBookings = bookings.filter(b => b.status === 'completed' || b.status === 'confirmed');
    
    if (completedBookings.length === 0) return;

    const lastBooking = completedBookings[0];
    const lastVisitDate = new Date(lastBooking.start_time);
    const daysSinceLastVisit = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));

    // Degrade character based on days since last visit
    const degradeRate = Math.min(daysSinceLastVisit * 0.5, 30);

    setCharacter(prev => ({
      ...prev,
      hair: Math.max(prev.hair - (degradeRate * 0.3), 0),
      skin: Math.max(prev.skin - (degradeRate * 0.2), 0),
      nails: Math.max(prev.nails - (degradeRate * 0.4), 0),
      energy: Math.max(prev.energy - (degradeRate * 0.1), 0),
      lastVisit: lastBooking.start_time
    }));
  };

  const updateAchievements = () => {
    const completed = bookings.filter(b => b.status === 'completed' || b.status === 'confirmed');
    const uniqueServices = new Set(completed.map(b => b.service_name)).size;

    setAchievements(prev => prev.map(ach => {
      if (ach.id === 'first_visit') {
        return { ...ach, progress: Math.min(completed.length, 1), unlocked: completed.length >= 1 };
      }
      if (ach.id === 'regular') {
        return { ...ach, progress: Math.min(completed.length, 5), unlocked: completed.length >= 5 };
      }
      if (ach.id === 'beauty_guru') {
        return { ...ach, progress: Math.min(uniqueServices, 10), unlocked: uniqueServices >= 10 };
      }
      if (ach.id === 'loyal') {
        return { ...ach, progress: Math.min(loyalty.points, 1000), unlocked: loyalty.points >= 1000 };
      }
      return ach;
    }));
  };

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'ru': return ru;
      case 'ar': return ar;
      default: return enUS;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      try {
        const bookingsData = await api.getClientBookings();
        setBookings(bookingsData.bookings);
      } catch (e) {
        console.error("Bookings error", e);
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_URL}/api/client/my-notifications?client_id=${user?.id}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (e) {
        console.error("Notifs error", e);
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_URL}/api/client/loyalty?client_id=${user?.id}`);
        if (res.ok) {
          const data = await res.json();
          setLoyalty(data);
        }
      } catch (e) {
        console.error("Loyalty error", e);
      }
    } catch (error) {
      console.error('Error loading account data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/client/upload-avatar`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        await handleProfileUpdate({ avatar_url: data.url });
      }
    } catch (error) {
      console.error("Avatar upload failed", error);
    }
  };

  const handleProfileUpdate = async (updates: any = {}) => {
    try {
      const payload = {
        client_id: user?.id,
        ...profileForm,
        ...updates
      };
      if (profileForm.new_password) {
        payload.password = profileForm.new_password;
      }

      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/client/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.client) {
          alert("Profile updated!");
          window.location.reload();
        }
      }
    } catch (error) {
      alert("Profile update error");
    }
  };

  const handleCancelClick = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookingToCancel(id);
  };

  const confirmCancel = async () => {
    if (!bookingToCancel) return;
    try {
      await api.cancelBooking(bookingToCancel);
      loadData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Cancellation error");
    } finally {
      setBookingToCancel(null);
    }
  };

  const handleDetailsClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const getLevelInfo = () => {
    const levels = [
      { name: 'Bronze', min: 0, max: 499, color: '#CD7F32', icon: Award },
      { name: 'Silver', min: 500, max: 999, color: '#C0C0C0', icon: Trophy },
      { name: 'Gold', min: 1000, max: 2499, color: '#FFD700', icon: Crown },
      { name: 'Platinum', min: 2500, max: 4999, color: '#E5E4E2', icon: Sparkles },
      { name: 'Diamond', min: 5000, max: Infinity, color: '#B9F2FF', icon: Zap }
    ];

    const currentLevel = levels.find(l => loyalty.points >= l.min && loyalty.points <= l.max) || levels[0];
    const nextLevel = levels.find(l => l.min > loyalty.points) || currentLevel;
    const progress = currentLevel === nextLevel ? 100 : ((loyalty.points - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100;

    return { currentLevel, nextLevel, progress, levels };
  };

  const getCharacterColor = (value: number) => {
    if (value >= 80) return 'text-green-500';
    if (value >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCharacterEmoji = () => {
    const avg = (character.hair + character.skin + character.nails + character.energy) / 4;
    if (avg >= 80) return '✨';
    if (avg >= 60) return '😊';
    if (avg >= 40) return '😐';
    return '😔';
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isBooking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-20 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <UserBookingWizard onClose={closeBooking} onSuccess={() => { closeBooking(); loadData(); }} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const levelInfo = getLevelInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Hero Header with Character */}
        <div className="relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black rounded-3xl shadow-2xl border border-white/10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
          
          <div className="relative p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Left: User Info */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="relative group">
                    <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-white/20 shadow-2xl ring-4 ring-white/10">
                      <AvatarImage src={currentUser.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-2xl">
                        {user.full_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </div>

                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{user.full_name}</h1>
                    <p className="text-white/60 text-sm mb-3">{user.phone || user.email}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
                        <levelInfo.currentLevel.icon className="w-4 h-4" style={{ color: levelInfo.currentLevel.color }} />
                        <span className="text-white font-semibold text-sm">{levelInfo.currentLevel.name}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <span className="text-white font-semibold text-sm">{loyalty.points} pts</span>
                      </div>
                    </div>

                    {/* Level Progress */}
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs text-white/60">
                        <span>{levelInfo.currentLevel.name}</span>
                        <span>{levelInfo.nextLevel.name}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 transition-all duration-500 rounded-full"
                          style={{ width: `${levelInfo.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/60">
                        {levelInfo.nextLevel.min - loyalty.points} points to {levelInfo.nextLevel.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={openBooking} 
                    className="flex-1 bg-white text-black hover:bg-white/90 shadow-lg h-12 text-base font-semibold"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    New Booking
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleLogout} 
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-12"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Right: Character Display */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    Your Character
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowCharacterEditor(true)}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>

                {/* Character Avatar */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 flex items-center justify-center text-6xl shadow-2xl">
                      {getCharacterEmoji()}
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-3 py-1 rounded-full border border-white/20">
                      <span className="text-white text-xs font-semibold">Age {character.age}</span>
                    </div>
                  </div>
                </div>

                {/* Character Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 flex items-center gap-1">
                        <Scissors className="w-3 h-3" /> Hair
                      </span>
                      <span className={`font-semibold ${getCharacterColor(character.hair)}`}>
                        {Math.round(character.hair)}%
                      </span>
                    </div>
                    <Progress value={character.hair} className="h-1.5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 flex items-center gap-1">
                        <Droplet className="w-3 h-3" /> Skin
                      </span>
                      <span className={`font-semibold ${getCharacterColor(character.skin)}`}>
                        {Math.round(character.skin)}%
                      </span>
                    </div>
                    <Progress value={character.skin} className="h-1.5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 flex items-center gap-1">
                        <Palette className="w-3 h-3" /> Nails
                      </span>
                      <span className={`font-semibold ${getCharacterColor(character.nails)}`}>
                        {Math.round(character.nails)}%
                      </span>
                    </div>
                    <Progress value={character.nails} className="h-1.5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Energy
                      </span>
                      <span className={`font-semibold ${getCharacterColor(character.energy)}`}>
                        {Math.round(character.energy)}%
                      </span>
                    </div>
                    <Progress value={character.energy} className="h-1.5" />
                  </div>
                </div>

                {character.lastVisit && (
                  <p className="text-xs text-white/40 text-center mt-4">
                    Last visit: {format(new Date(character.lastVisit), 'd MMM yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                  <p className="text-xs text-muted-foreground">Total Visits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{achievements.filter(a => a.unlocked).length}</p>
                  <p className="text-xs text-muted-foreground">Achievements</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg hover:shadow-green-500/10 transition-all">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loyalty.points}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{levelInfo.currentLevel.name}</p>
                  <p className="text-xs text-muted-foreground">Level</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="bookings" className="w-full">
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-2 mb-6">
            <TabsList className="w-full grid grid-cols-2 md:grid-cols-5 gap-2 bg-transparent h-auto p-0">
              <TabsTrigger 
                value="bookings" 
                className="data-[state=active]:bg-black data-[state=active]:text-white rounded-xl py-3 text-sm md:text-base"
              >
                <Calendar className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Bookings</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="data-[state=active]:bg-black data-[state=active]:text-white rounded-xl py-3 text-sm md:text-base"
              >
                <User className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger 
                value="rewards" 
                className="data-[state=active]:bg-black data-[state=active]:text-white rounded-xl py-3 text-sm md:text-base relative"
              >
                <Gift className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Rewards</span>
                {loyalty.points > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {loyalty.points > 99 ? '99+' : loyalty.points}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="achievements" 
                className="data-[state=active]:bg-black data-[state=active]:text-white rounded-xl py-3 text-sm md:text-base"
              >
                <Trophy className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Achievements</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="data-[state=active]:bg-black data-[state=active]:text-white rounded-xl py-3 text-sm md:text-base relative"
              >
                <Bell className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Notifications</span>
                {notifications.filter(n => !n.read_at).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.read_at).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4 mt-0">
            <div className="flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-bold">My Appointments</h2>
              <Button onClick={openBooking} size="sm" className="bg-black text-white hover:bg-black/90">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Booking</span>
              </Button>
            </div>

            {bookings.length > 0 ? (
              <div className="grid gap-4">
                {bookings.map(booking => (
                  <Card 
                    key={booking.id} 
                    className="hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer border-l-4 border-l-primary overflow-hidden group"
                    onClick={() => handleDetailsClick(booking)}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        <div className="flex-1 p-4 md:p-6">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-bold text-lg md:text-xl">{booking.service_name}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap ml-2 ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {booking.status}
                            </span>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4 text-primary" />
                              <span>{format(new Date(booking.start_time), "d MMMM yyyy", { locale: getDateLocale() })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-4 h-4 text-primary" />
                              <span>{format(new Date(booking.start_time), "HH:mm")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="w-4 h-4 text-primary" />
                              <span>{booking.master_name || "Not selected"}</span>
                            </div>
                            {booking.price && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="font-bold text-foreground">{booking.price} AED</span>
                              </div>
                            )}
                          </div>

                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => handleCancelClick(booking.id, e)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel Booking
                            </Button>
                          )}
                        </div>

                        <div className="w-full sm:w-2 bg-gradient-to-b from-primary via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Calendar className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Start your beauty journey by booking your first appointment!
                  </p>
                  <Button onClick={openBooking} className="bg-black text-white hover:bg-black/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-0">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-b">
                <CardTitle className="text-2xl">Profile Settings</CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Personal Information
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Full Name</Label>
                      <Input 
                        value={profileForm.name} 
                        onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Phone Number</Label>
                      <Input 
                        value={profileForm.phone} 
                        onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Email</Label>
                      <Input 
                        type="email"
                        value={profileForm.email} 
                        onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Date of Birth</Label>
                      <Input 
                        type="date"
                        value={profileForm.birth_date} 
                        onChange={e => setProfileForm({ ...profileForm, birth_date: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Gender</Label>
                      <Select 
                        value={profileForm.gender} 
                        onValueChange={(value) => setProfileForm({ ...profileForm, gender: value })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="neutral">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Security
                  </h3>
                  <div className="space-y-2 max-w-md">
                    <Label className="text-sm font-medium">New Password</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={profileForm.new_password}
                      onChange={e => setProfileForm({ ...profileForm, new_password: e.target.value })}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">Leave empty if you don't want to change</p>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t">
                  <Button 
                    onClick={() => handleProfileUpdate()} 
                    className="bg-black text-white hover:bg-black/90 px-8 h-11"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6 mt-0">
            {/* Points Balance */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 p-8 md:p-12 text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <p className="text-white/80 text-sm uppercase tracking-wider mb-2">Your Balance</p>
                    <h2 className="text-5xl md:text-6xl font-bold mb-4">{loyalty.points}</h2>
                    <p className="text-white/80">points available</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-2xl p-6 text-center">
                    <levelInfo.currentLevel.icon className="w-12 h-12 mx-auto mb-2" />
                    <p className="font-bold text-lg">{levelInfo.currentLevel.name}</p>
                    <p className="text-sm text-white/80">Member</p>
                  </div>
                </div>

                <div className="mt-8 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to {levelInfo.nextLevel.name}</span>
                    <span>{Math.round(levelInfo.progress)}%</span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-500"
                      style={{ width: `${levelInfo.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-white/80">
                    {levelInfo.nextLevel.min - loyalty.points} more points needed
                  </p>
                </div>
              </div>
            </Card>

            {/* Membership Tiers */}
            <div>
              <h3 className="text-xl font-bold mb-4">Membership Tiers</h3>
              <div className="grid md:grid-cols-5 gap-4">
                {levelInfo.levels.map((level, idx) => (
                  <Card 
                    key={level.name}
                    className={`relative overflow-hidden transition-all ${
                      level.name === levelInfo.currentLevel.name 
                        ? 'ring-2 ring-primary shadow-lg scale-105' 
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <CardContent className="p-4 md:p-6 text-center">
                      <level.icon className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3" style={{ color: level.color }} />
                      <h4 className="font-bold text-base md:text-lg mb-1">{level.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {level.min === 0 ? '0' : level.min}+ points
                      </p>
                      {level.name === levelInfo.currentLevel.name && (
                        <div className="absolute top-2 right-2">
                          <Crown className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Points History */}
            <Card>
              <CardHeader>
                <CardTitle>Points History</CardTitle>
                <CardDescription>Track your earned and spent points</CardDescription>
              </CardHeader>
              <CardContent>
                {loyalty.history.length > 0 ? (
                  <div className="space-y-3">
                    {loyalty.history.map((h: any, i: number) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            h.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {h.amount > 0 ? (
                              <Plus className="w-5 h-5 text-green-600" />
                            ) : (
                              <ShoppingBag className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{h.reason}</p>
                            <p className="text-xs text-muted-foreground">{h.date}</p>
                          </div>
                        </div>
                        <span className={`font-bold text-lg ${
                          h.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {h.amount > 0 ? '+' : ''}{h.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No transaction history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-4 mt-0">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Your Achievements</h2>
              <p className="text-muted-foreground">
                Unlock rewards by completing challenges
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {achievements.map(achievement => (
                <Card 
                  key={achievement.id}
                  className={`relative overflow-hidden transition-all ${
                    achievement.unlocked 
                      ? 'bg-gradient-to-br from-primary/10 to-purple-500/5 border-primary/30 shadow-lg' 
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        achievement.unlocked 
                          ? 'bg-gradient-to-br from-primary to-purple-600' 
                          : 'bg-muted'
                      }`}>
                        <achievement.icon className={`w-8 h-8 ${
                          achievement.unlocked ? 'text-white' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1">{achievement.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-semibold">
                              {achievement.progress} / {achievement.maxProgress}
                            </span>
                          </div>
                          <Progress 
                            value={(achievement.progress / achievement.maxProgress) * 100} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>
                    {achievement.unlocked && (
                      <div className="absolute top-4 right-4">
                        <div className="bg-green-500 text-white rounded-full p-1">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-0">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Stay updated with your appointments and offers</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {notifications.length > 0 ? (
                  <div className="divide-y">
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-4 md:p-6 transition-colors ${
                          !n.read_at 
                            ? 'bg-primary/5 hover:bg-primary/10' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            !n.read_at ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            <Bell className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold">{n.title}</h4>
                              {!n.read_at && (
                                <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{n.message}</p>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(n.created_at), 'd MMM yyyy, HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Bell className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No notifications</h3>
                    <p className="text-muted-foreground">You're all caught up!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Character Editor Dialog */}
      <Dialog open={showCharacterEditor} onOpenChange={setShowCharacterEditor}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Customize Your Character</DialogTitle>
            <DialogDescription>
              Personalize your virtual avatar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Character Preview */}
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 flex items-center justify-center text-6xl shadow-xl">
                {getCharacterEmoji()}
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>Gender</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['male', 'female', 'neutral'] as const).map(gender => (
                  <Button
                    key={gender}
                    variant={character.gender === gender ? 'default' : 'outline'}
                    onClick={() => setCharacter({ ...character, gender })}
                    className="capitalize"
                  >
                    {gender}
                  </Button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label>Age: {character.age}</Label>
              <input 
                type="range" 
                min="18" 
                max="80" 
                value={character.age}
                onChange={(e) => setCharacter({ ...character, age: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Outfit */}
            <div className="space-y-2">
              <Label>Outfit Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {['casual', 'elegant', 'sporty', 'business', 'party', 'beach'].map(outfit => (
                  <Button
                    key={outfit}
                    variant={character.outfit === outfit ? 'default' : 'outline'}
                    onClick={() => setCharacter({ ...character, outfit })}
                    className="capitalize"
                    size="sm"
                  >
                    {outfit}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCharacterEditor(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowCharacterEditor(false);
                // Character auto-saves via useEffect
              }}
              className="bg-black text-white hover:bg-black/90"
            >
              <Check className="w-4 h-4 mr-2" />
              Save Character
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <AlertDialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancel} 
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Booking Details</DialogTitle>
            <DialogDescription>
              Complete information about your appointment
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-4 rounded-lg">
                <h3 className="font-bold text-xl mb-2">{selectedBooking.service_name}</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                  selectedBooking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  selectedBooking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedBooking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-semibold">
                      {format(new Date(selectedBooking.start_time), "d MMM yyyy", { locale: getDateLocale() })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-semibold">
                      {format(new Date(selectedBooking.start_time), "HH:mm")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Master</p>
                    <p className="font-semibold">{selectedBooking.master_name || "Not selected"}</p>
                  </div>
                </div>

                {selectedBooking.price && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Gift className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="font-semibold">{selectedBooking.price} AED</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedBooking && (selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  setBookingToCancel(selectedBooking.id);
                  setSelectedBooking(null);
                }}
              >
                Cancel Booking
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedBooking(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
