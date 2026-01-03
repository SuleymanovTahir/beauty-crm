import { useState } from 'react';
import { Home, Calendar, Image as ImageIcon, Award, Users, User, Bell, Globe, Gift, TrendingUp, Star, Copy, Trophy, X, Clock } from 'lucide-react';
import { ServiceSelection } from './components/ServiceSelection';
import { BookingSummary } from './components/BookingSummary';
import { BookingConfirmation } from './components/BookingConfirmation';

export default function App() {
  const [activeTab, setActiveTab] = useState('loyalty');
  const [bookingStep, setBookingStep] = useState<'service' | 'summary' | 'confirmation' | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'loyalty', label: 'Loyalty', icon: Award },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'masters', label: 'Masters', icon: Users },
    { id: 'beauty-profile', label: 'Beauty profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const levels = [
    { 
      name: 'Bronze', 
      discount: '0%', 
      requirement: 'booking level',
      isCurrent: true,
      color: '#CD7F32'
    },
    { 
      name: 'Silver', 
      discount: '5%', 
      requirement: 'From 1000 points',
      isCurrent: false,
      color: '#C0C0C0'
    },
    { 
      name: 'Gold', 
      discount: '10%', 
      requirement: 'From 5000 points',
      isCurrent: false,
      color: '#FFD700'
    },
    { 
      name: 'Platinum', 
      discount: '', 
      requirement: 'From 10000 points',
      isCurrent: false,
      color: '#E5E4E2'
    },
  ];

  const renderContent = () => {
    if (activeTab === 'achievements') {
      return (
        <div className="max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Achievements</h1>
            <p className="text-sm text-gray-500">Your progress: 0 from 0 achievements</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="text-gray-700" size={20} />
              <h2 className="font-semibold">Overall progress</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">Start collecting achievements today!</p>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Achievements unlocked</span>
              <span className="text-lg font-bold">0 / 0</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 mb-1">0</div>
                <div className="text-xs text-gray-500">Received</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 mb-1">0</div>
                <div className="text-xs text-gray-500">Left</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 mb-1">NaN%</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="font-semibold mb-4">All achievements</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Trophy className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="text-gray-500">No achievements yet</p>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="font-semibold mb-4">Active challenges</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Award className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="text-gray-500">No active challenges</p>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'bookings') {
      return (
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">My entries</h1>
              <p className="text-sm text-gray-500">Manage your visits</p>
            </div>
            <button className="bg-black text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-800">
              <Calendar size={16} />
              Add booking
            </button>
          </div>

          <div className="flex gap-2 mb-6">
            <button className="flex-1 bg-white border border-gray-300 px-4 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 font-medium">
              <Calendar size={16} />
              Upcoming
            </button>
            <button className="flex-1 bg-white border border-gray-200 px-4 py-2.5 rounded-lg text-sm text-gray-600 flex items-center justify-center gap-2 hover:border-gray-300">
              <Clock size={16} />
              Story
            </button>
            <button className="flex-1 bg-white border border-gray-200 px-4 py-2.5 rounded-lg text-sm text-gray-600 flex items-center justify-center gap-2 hover:border-gray-300">
              <Award size={16} />
              Repetitive
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex gap-4">
              <img 
                src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=80&h=80&fit=crop" 
                alt="Master"
                className="w-14 h-14 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">Kasymova Gulcehre</h3>
                    <p className="text-xs text-gray-500">Master</p>
                  </div>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                    Upcoming
                  </span>
                </div>
                
                <p className="text-sm mb-3">Ламинирование бровей и ресниц</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>16 января 2026 г.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>15:00</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold">300 AED</span>
                  <div className="flex gap-2">
                    <button className="text-sm text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                      To calendar
                    </button>
                    <button className="text-sm text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                      Change
                    </button>
                    <button className="text-sm text-red-600 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Loyalty page
    return (
      <div className="max-w-4xl">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500 mb-2">Total spent</div>
            <div className="text-2xl font-bold">150 AED</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500 mb-2">Total Saved</div>
            <div className="text-2xl font-bold">0 AED</div>
          </div>
        </div>

        {/* Referral Program */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="text-purple-600" size={20} />
            <h2 className="font-semibold">Referral program</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">Invite friends and get bonuses</p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">Your promo code</span>
              <button className="text-gray-500 hover:text-gray-700 p-1">
                <Copy size={16} />
              </button>
            </div>
            
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-medium text-gray-700 mb-2">How does this work:</p>
              <ul className="space-y-1.5 pl-4">
                <li className="flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span>Share a promo code with a friend</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span>A friend indicates the code when registering for the first time</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span>You both get bonus points!</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">+500</div>
              <div className="text-xs text-gray-600 mt-1">points for you</div>
            </div>
            <div className="text-center p-3 bg-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">+300</div>
              <div className="text-xs text-gray-600 mt-1">points for a friend</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-xs text-gray-600 mt-1">invitations</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="bg-black text-white py-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-gray-800">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button className="bg-white text-black border border-gray-300 py-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-gray-50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram
            </button>
          </div>
        </div>

        {/* Loyalty and Cashback */}
        <div className="mb-6">
          <h2 className="font-semibold mb-4">Loyalty and Cashback</h2>
          <p className="text-sm text-gray-600 mb-4">Collect points and get cashback from each service</p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="text-green-600" size={20} />
                <span className="text-sm font-medium">Your Cashback</span>
              </div>
              <div className="text-3xl font-bold mb-1">10%</div>
              <div className="text-xs text-gray-500">The cost of each service is refunded in points</div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="text-blue-600" size={20} />
                <span className="text-sm font-medium">Points available</span>
              </div>
              <div className="text-3xl font-bold mb-1">0</div>
              <div className="text-xs text-gray-500">1 point = 1 AED discount</div>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="text-amber-500 fill-amber-500" size={20} />
              <span className="font-semibold">Bronze status</span>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">0</div>
              <div className="text-xs text-gray-500">points</div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 mb-4">
            0 total accumulated • Discount 0%
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-700">To Silver level</span>
              <span className="font-semibold">1000 points</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div className="bg-gradient-to-r from-gray-400 to-gray-500 h-2 rounded-full" style={{width: '0%'}}></div>
            </div>
            <div className="text-xs text-gray-500">
              Upon reaching Silver level your discount will be 5%
            </div>
          </div>
        </div>

        {/* Level System */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-blue-600" size={20} />
            <h2 className="font-semibold">Level system</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">Collect points and get more privileges</p>
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-2 gap-4">
          {levels.map((level) => (
            <div
              key={level.name}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: level.color }}
                  />
                  <span className="font-semibold">{level.name}</span>
                  {level.isCurrent && (
                    <span className="bg-gray-900 text-white text-xs px-2 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                {level.discount && (
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {level.discount}
                    </div>
                    <div className="text-xs text-gray-500">discount</div>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">{level.requirement}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="size-full flex bg-gray-50">
      {/* If booking flow is active, show booking pages */}
      {bookingStep === 'service' && (
        <ServiceSelection
          onNext={(service) => {
            setSelectedService(service);
            setBookingStep('summary');
          }}
          onBack={() => setBookingStep(null)}
        />
      )}
      
      {bookingStep === 'summary' && selectedService && (
        <BookingSummary
          service={selectedService}
          onNext={() => setBookingStep('confirmation')}
          onBack={() => setBookingStep('service')}
        />
      )}
      
      {bookingStep === 'confirmation' && selectedService && (
        <BookingConfirmation
          service={selectedService}
          onBack={() => setBookingStep('summary')}
          onConfirm={() => {
            alert('Booking confirmed!');
            setBookingStep(null);
            setActiveTab('bookings');
          }}
        />
      )}
      
      {/* Main app with sidebar */}
      {!bookingStep && (
        <>
          {/* Sidebar */}
          <div className="w-48 bg-white border-r border-gray-200 flex flex-col">
            {/* Logo */}
            <div className="p-4 border-b border-gray-200">
              <div className="text-sm">M.Le Diamant Beauty Lou...</div>
            </div>

            {/* User */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  T
                </div>
                <div>
                  <div className="font-medium text-sm">Tahir</div>
                  <div className="text-xs text-gray-500">Bronze</div>
                </div>
              </div>
            </div>

            {/* Menu */}
            <nav className="flex-1 p-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                      activeTab === item.id
                        ? 'bg-pink-100 text-pink-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button 
                onClick={() => setBookingStep('service')}
                className="w-full bg-gray-900 text-white py-2 px-3 rounded-lg text-xs mb-3 hover:bg-gray-800"
              >
                New Booking
              </button>
              <div className="flex items-center gap-2 text-sm">
                <Globe size={16} />
                <span>🇬🇧</span>
                <span className="text-xs text-gray-500">Log out</span>
              </div>
              <div className="text-xs text-gray-400 mt-2">M.Le Diamant Beauty Lounge App v1.0.0</div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-8 overflow-auto">
            {renderContent()}
          </div>
        </>
      )}
    </div>
  );
}