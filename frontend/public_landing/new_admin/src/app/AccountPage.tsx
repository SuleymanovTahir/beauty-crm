import { useState } from 'react';
import { format, addDays } from 'date-fns';
import {
  Calendar, Clock, Star, MapPin, Phone, Mail, Gift,
  TrendingUp, Award, Camera, Heart, Settings, ChevronRight,
  Sparkles, Crown, Target, Zap, Users, FileText, MessageCircle,
  Plus, Download, Share2, Edit, Trash2, CheckCircle2, Trophy,
  ChartLine, Flame, BookOpen, Bell, User, CreditCard, History,
  Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Separator } from './components/ui/separator';
import { motion } from 'motion/react';
import { ScrollArea } from './components/ui/scroll-area';

// Mock Data
const MOCK_USER = {
  id: 1,
  full_name: 'Anna Ivanova',
  email: 'anna@example.com',
  phone: '+971 50 123 4567',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  memberSince: '2024-06-15',
  loyaltyLevel: 'Gold',
  loyaltyPoints: 1250,
  nextLevelPoints: 2000,
  totalSpent: 4250,
  totalSaved: 640,
  visitCount: 12,
};

const MOCK_UPCOMING = [
  {
    id: 1,
    date: addDays(new Date(), 3),
    time: '14:00',
    service: 'Hair Coloring',
    master: {
      name: 'Elena Petrova',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
      position: 'Senior Hair Stylist'
    },
    price: 400,
    duration: 120,
    status: 'confirmed'
  },
  {
    id: 2,
    date: addDays(new Date(), 10),
    time: '11:30',
    service: 'Manicure',
    master: {
      name: 'Maria Santos',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      position: 'Nail Specialist'
    },
    price: 120,
    duration: 45,
    status: 'confirmed'
  },
];

const MOCK_HISTORY = [
  {
    id: 1,
    date: new Date('2024-12-10'),
    service: 'Hair Cut',
    master: 'Elena Petrova',
    price: 150,
    rating: 5,
    hasReview: true,
    pointsEarned: 15
  },
  {
    id: 2,
    date: new Date('2024-11-25'),
    service: 'Facial Treatment',
    master: 'Sofia Ahmed',
    price: 250,
    rating: 5,
    hasReview: true,
    pointsEarned: 25
  },
  {
    id: 3,
    date: new Date('2024-11-10'),
    service: 'Manicure & Pedicure',
    master: 'Maria Santos',
    price: 270,
    rating: 4,
    hasReview: false,
    pointsEarned: 27
  },
];

const MOCK_ACHIEVEMENTS = [
  { id: 1, name: 'First Visit', icon: '🎉', unlocked: true, date: '2024-06-15' },
  { id: 2, name: '5 Visits', icon: '⭐', unlocked: true, date: '2024-08-20' },
  { id: 3, name: '10 Visits', icon: '🏆', unlocked: true, date: '2024-11-05' },
  { id: 4, name: '3 Month Streak', icon: '🔥', unlocked: true, date: '2024-10-15' },
  { id: 5, name: 'Service Explorer', icon: '🎨', unlocked: true, date: '2024-09-10' },
  { id: 6, name: '25 Visits', icon: '💎', unlocked: false, progress: 48 },
];

const LOYALTY_TIERS = [
  { name: 'Bronze', minPoints: 0, discount: 5, color: 'from-amber-700 to-amber-500' },
  { name: 'Silver', minPoints: 500, discount: 10, color: 'from-gray-400 to-gray-300' },
  { name: 'Gold', minPoints: 1000, discount: 15, color: 'from-yellow-500 to-yellow-300' },
  { name: 'Platinum', minPoints: 2000, discount: 20, color: 'from-purple-600 to-purple-400' },
];

interface Props {
  onClose?: () => void;
}

export function AccountPage({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  const currentTier = LOYALTY_TIERS.find(tier => 
    MOCK_USER.loyaltyPoints >= tier.minPoints && 
    MOCK_USER.loyaltyPoints < (LOYALTY_TIERS[LOYALTY_TIERS.indexOf(tier) + 1]?.minPoints || Infinity)
  ) || LOYALTY_TIERS[0];

  const nextTier = LOYALTY_TIERS[LOYALTY_TIERS.indexOf(currentTier) + 1];

  const progressToNextTier = nextTier 
    ? ((MOCK_USER.loyaltyPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
    : 100;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white pt-16 pb-32 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Profile Section */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <Avatar className="w-20 h-20 border-4 border-white shadow-xl">
                  <AvatarImage src={MOCK_USER.avatar} />
                  <AvatarFallback>{MOCK_USER.full_name[0]}</AvatarFallback>
                </Avatar>
              </motion.div>
              <div>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-bold mb-1"
                >
                  {getGreeting()}, {MOCK_USER.full_name.split(' ')[0]}!
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-white/90"
                >
                  You look absolutely fabulous! ✨
                </motion.p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {/* Quick Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { icon: Trophy, label: 'Level', value: currentTier.name, gradient: currentTier.color },
              { icon: Zap, label: 'Points', value: MOCK_USER.loyaltyPoints, gradient: 'from-blue-500 to-cyan-400' },
              { icon: Heart, label: 'Visits', value: MOCK_USER.visitCount, gradient: 'from-pink-500 to-rose-400' },
              { icon: Sparkles, label: 'Saved', value: `${MOCK_USER.totalSaved} AED`, gradient: 'from-green-500 to-emerald-400' },
            ].map((stat, idx) => (
              <Card key={idx} className="border-0 bg-white/10 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-2`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-xs text-white/80 mb-1">{stat.label}</div>
                  <div className="text-xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <Card className="border-2 shadow-xl">
            <CardContent className="p-2">
              <ScrollArea>
                <TabsList className="grid w-full grid-cols-5 lg:grid-cols-7">
                  <TabsTrigger value="overview">
                    <User className="w-4 h-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="appointments">
                    <Calendar className="w-4 h-4 mr-2" />
                    Appointments
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    <History className="w-4 h-4 mr-2" />
                    History
                  </TabsTrigger>
                  <TabsTrigger value="loyalty">
                    <Crown className="w-4 h-4 mr-2" />
                    Loyalty
                  </TabsTrigger>
                  <TabsTrigger value="gallery">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Gallery
                  </TabsTrigger>
                  <TabsTrigger value="achievements" className="hidden lg:flex">
                    <Trophy className="w-4 h-4 mr-2" />
                    Achievements
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="hidden lg:flex">
                    <Settings className="w-4 h-4 mr-2" />
                    Profile
                  </TabsTrigger>
                </TabsList>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Next Appointment */}
            {MOCK_UPCOMING[0] && (
              <Card className="border-2 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5" />
                    <h2 className="text-xl font-bold">Next Appointment</h2>
                  </div>
                  <p className="text-white/90 text-sm">
                    In {Math.ceil((MOCK_UPCOMING[0].date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="w-16 h-16 border-2 border-purple-200">
                          <AvatarImage src={MOCK_UPCOMING[0].master.photo} />
                          <AvatarFallback>{MOCK_UPCOMING[0].master.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-lg">{MOCK_UPCOMING[0].master.name}</h3>
                          <p className="text-sm text-muted-foreground">{MOCK_UPCOMING[0].master.position}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Service</div>
                            <div className="font-medium">{MOCK_UPCOMING[0].service}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Date & Time</div>
                            <div className="font-medium">
                              {format(MOCK_UPCOMING[0].date, 'EEEE, MMMM dd')} at {MOCK_UPCOMING[0].time}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Location</div>
                            <div className="font-medium">Shop 13, Amwaj 2, JBR Dubai</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                        <MapPin className="w-4 h-4 mr-2" />
                        Navigate
                      </Button>
                      <Button variant="outline">
                        <Calendar className="w-4 h-4 mr-2" />
                        Add to Calendar
                      </Button>
                      <Button variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Reschedule
                      </Button>
                      <Button variant="outline" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Plus, label: 'New Booking', color: 'from-purple-500 to-pink-500' },
                { icon: History, label: 'Repeat Last', color: 'from-blue-500 to-cyan-500' },
                { icon: MessageCircle, label: 'Contact Salon', color: 'from-green-500 to-emerald-500' },
                { icon: Users, label: 'My Masters', color: 'from-orange-500 to-red-500' },
              ].map((action, idx) => (
                <Card key={idx} className="border-2 hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="font-medium text-sm">{action.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Personal Insights */}
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Your Beauty Journey
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50">
                    <div className="text-3xl font-bold text-purple-600 mb-1">{MOCK_USER.visitCount}</div>
                    <div className="text-sm text-muted-foreground">Total Visits</div>
                    <p className="text-xs text-purple-600 mt-2">More than 80% of clients! 🎉</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50">
                    <div className="text-3xl font-bold text-blue-600 mb-1">{MOCK_USER.totalSaved} AED</div>
                    <div className="text-sm text-muted-foreground">Total Saved</div>
                    <p className="text-xs text-blue-600 mt-2">With {currentTier.discount}% discount</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50">
                    <div className="text-3xl font-bold text-green-600 mb-1">6</div>
                    <div className="text-sm text-muted-foreground">Months With Us</div>
                    <p className="text-xs text-green-600 mt-2">Thank you for being amazing! 💚</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_HISTORY.slice(0, 3).map((visit, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl hover:bg-purple-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {format(visit.date, 'dd')}
                        </div>
                        <div>
                          <div className="font-medium">{visit.service}</div>
                          <div className="text-sm text-muted-foreground">{visit.master}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{visit.price} AED</div>
                        <div className="flex items-center gap-1 text-sm text-yellow-600">
                          {[...Array(visit.rating)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_UPCOMING.map(apt => (
                    <div key={apt.id} className="p-6 rounded-xl border-2 hover:border-purple-500 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-14 h-14">
                            <AvatarImage src={apt.master.photo} />
                            <AvatarFallback>{apt.master.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-bold text-lg">{apt.service}</h3>
                            <p className="text-sm text-muted-foreground">{apt.master.name}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Confirmed
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{format(apt.date, 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{apt.time} ({apt.duration} min)</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4 mr-2" />
                          Reschedule
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle>Visit History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_HISTORY.map(visit => (
                    <div key={visit.id} className="p-6 rounded-xl border-2 hover:bg-purple-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-lg">{visit.service}</h3>
                          <p className="text-sm text-muted-foreground">{visit.master}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(visit.date, 'MMMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{visit.price} AED</div>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < visit.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">
                          +{visit.pointsEarned} points earned
                        </Badge>
                        {!visit.hasReview && (
                          <Button size="sm" variant="outline">
                            <Star className="w-4 h-4 mr-2" />
                            Leave Review
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Book Again
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loyalty Tab */}
          <TabsContent value="loyalty" className="space-y-6">
            {/* Current Level */}
            <Card className="border-2 shadow-xl overflow-hidden">
              <div className={`bg-gradient-to-r ${currentTier.color} text-white p-8`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Crown className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold mb-1">{currentTier.name} Member</h2>
                    <p className="text-white/90">Enjoy {currentTier.discount}% discount</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{MOCK_USER.loyaltyPoints} points</span>
                    {nextTier && <span>{nextTier.minPoints} points to {nextTier.name}</span>}
                  </div>
                  <Progress value={progressToNextTier} className="h-3 bg-white/20" />
                </div>
              </div>
              
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Your Benefits</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { icon: TrendingUp, title: `${currentTier.discount}% Discount`, desc: 'On all services' },
                    { icon: Star, title: 'Priority Booking', desc: 'Book appointments first' },
                    { icon: Gift, title: 'Special Offers', desc: 'Exclusive member deals' },
                    { icon: Award, title: 'Birthday Gift', desc: 'Complimentary service' },
                  ].map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-4 rounded-lg bg-purple-50">
                      <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white">
                        <benefit.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">{benefit.title}</div>
                        <div className="text-sm text-muted-foreground">{benefit.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* All Tiers */}
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle>Loyalty Tiers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {LOYALTY_TIERS.map((tier, idx) => {
                    const isCurrentTier = tier.name === currentTier.name;
                    const isUnlocked = MOCK_USER.loyaltyPoints >= tier.minPoints;
                    
                    return (
                      <div
                        key={idx}
                        className={`p-6 rounded-xl border-2 ${
                          isCurrentTier
                            ? 'border-purple-500 bg-purple-50'
                            : isUnlocked
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-white`}>
                              <Crown className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">{tier.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {tier.minPoints}+ points • {tier.discount}% discount
                              </p>
                            </div>
                          </div>
                          {isCurrentTier && (
                            <Badge className="bg-purple-600">Current</Badge>
                          )}
                          {isUnlocked && !isCurrentTier && (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50">
                    <div className="text-sm text-muted-foreground mb-1">Total Spent</div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">{MOCK_USER.totalSpent} AED</div>
                    <p className="text-xs text-muted-foreground">Across {MOCK_USER.visitCount} visits</p>
                  </div>
                  
                  <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50">
                    <div className="text-sm text-muted-foreground mb-1">Total Saved</div>
                    <div className="text-3xl font-bold text-green-600 mb-2">{MOCK_USER.totalSaved} AED</div>
                    <p className="text-xs text-muted-foreground">With {currentTier.discount}% discount</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gallery Tab */}
          <TabsContent value="gallery" className="space-y-6">
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>My Transformation Gallery</CardTitle>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden group relative cursor-pointer">
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                          <Button size="sm" variant="secondary">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="secondary">
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-center h-full text-6xl">
                        {i === 1 && '💇'}
                        {i === 2 && '💅'}
                        {i === 3 && '✨'}
                        {i === 4 && '💄'}
                        {i === 5 && '🌸'}
                        {i === 6 && '🦋'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle>Achievements & Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {MOCK_ACHIEVEMENTS.map(achievement => (
                    <div
                      key={achievement.id}
                      className={`p-6 rounded-xl border-2 text-center ${
                        achievement.unlocked
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="text-5xl mb-3">{achievement.icon}</div>
                      <div className="font-bold mb-1">{achievement.name}</div>
                      {achievement.unlocked ? (
                        <div className="text-xs text-muted-foreground">
                          {achievement.date && format(new Date(achievement.date), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        <div className="mt-2">
                          <Progress value={achievement.progress || 0} className="h-2" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {achievement.progress}% complete
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-purple-50 transition-colors">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Full Name</div>
                    <div className="font-medium">{MOCK_USER.full_name}</div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-purple-50 transition-colors">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{MOCK_USER.email}</div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-purple-50 transition-colors">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium">{MOCK_USER.phone}</div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-between">
                  <span>Language</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between">
                  <span>Notifications</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between">
                  <span>Privacy Settings</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
