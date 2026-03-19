import { Check, Info } from 'lucide-react';

const HERO_CARDS = [
  { day: 1, claimed: true, type: 'common' },
  { day: 2, claimed: true, type: 'common' },
  { day: 3, unlocked: true, type: 'rare', badge: 'green' },
  { day: 4, unlocked: true, type: 'rare', badge: 'gold' },
  { day: 5, unlocked: true, type: 'rare', badge: 'gold' },
  { day: 6, unlocked: true, type: 'rare', badge: 'blue' },
  { day: 7, unlocked: true, type: 'rare', badge: 'blue' },
  { day: 8, unlocked: true, type: 'rare', badge: 'green' },
  { day: 9, unlocked: true, type: 'rare', badge: 'gold' },
  { day: 10, unlocked: true, type: 'rare', badge: 'blue' },
  { day: 11, unlocked: true, type: 'rare', badge: 'green' },
  { day: 12, unlocked: true, type: 'rare', badge: 'green' },
  { day: 13, unlocked: true, type: 'rare', badge: 'blue' },
  { day: 14, unlocked: true, type: 'rare', badge: 'gold' },
  { day: 15, unlocked: true, type: 'rare', badge: 'blue' },
  { day: 16, unlocked: true, type: 'rare', badge: 'green' },
  { day: 17, unlocked: true, type: 'rare', badge: 'blue' },
  { day: 18, unlocked: true, type: 'rare', badge: 'gold' },
  { day: 19, unlocked: true, type: 'rare', badge: 'blue' },
  { day: 20, unlocked: true, type: 'rare', badge: 'green' },
  { day: 21, unlocked: true, type: 'rare', badge: 'gold' },
  { day: 22, unlocked: true, type: 'rare', badge: 'blue' },
  { day: 23, unlocked: true, type: 'rare', badge: 'green' },
  { day: 24, unlocked: true, type: 'rare', badge: 'gold' },
  { day: 25, unlocked: true, type: 'rare', badge: 'gold' },
  { day: 26, unlocked: true, type: 'rare', badge: 'blue' },
  { day: 27, unlocked: true, type: 'rare', badge: 'green' },
  { day: 28, unlocked: false, type: 'rare', badge: 'gold' },
];

export function LoginRewards() {
  const currentLogins = 2;

  return (
    <div className="w-full h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-7xl aspect-video bg-gradient-to-br from-amber-200/80 via-yellow-100/60 to-orange-200/80 rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header Section */}
          <div className="relative h-2/5 overflow-hidden bg-gradient-to-br from-amber-300 to-orange-300">
            {/* Header Content */}
            <div className="relative h-full flex flex-col justify-between p-6">
              {/* Top Bar */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-amber-900">
                  <Info className="w-5 h-5" />
                  <span className="text-lg italic font-serif">Login Every Day</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-gray-900/80 text-white px-4 py-1.5 rounded-full text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full" />
                    <span>Event Time: No Limit</span>
                  </div>
                  <button className="bg-gray-800/80 text-white px-5 py-2 rounded-full text-sm hover:bg-gray-700/80 transition">
                    Rewards
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="text-5xl font-bold italic text-red-600 drop-shadow-lg" style={{ fontFamily: 'Georgia, serif' }}>
                Get Free Heroes
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-[#7d1b3d] px-6 pb-6 pt-4">
            {/* Progress Bar Section */}
            <div className="bg-gradient-to-r from-rose-900/50 to-rose-800/50 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between">
                {/* Left Side - Total Logins Info */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-24 h-32 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg transform -rotate-6 absolute top-0 left-0 opacity-70" />
                    <div className="w-24 h-32 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg transform rotate-3 absolute top-0 left-2 opacity-80" />
                    <div className="w-24 h-32 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg relative flex items-center justify-center">
                      <div className="text-center text-amber-900">
                        <div className="text-xs opacity-70">Card</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-amber-300 text-sm italic">Total Logins</div>
                    <div className="text-yellow-400 text-2xl font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>
                      Get S-Level Heroes
                    </div>
                  </div>
                </div>

                {/* Center - Progress Bar */}
                <div className="flex-1 mx-8 flex items-center gap-4">
                  {/* Current Login Count */}
                  <div className="relative">
                    <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl">
                      <div className="text-center">
                        <div className="text-6xl font-bold text-amber-900">{currentLogins}</div>
                        <div className="text-sm text-amber-900 italic mt-1">Logins</div>
                      </div>
                    </div>
                    <div className="absolute top-0 left-0 w-full text-center -mt-2">
                      <span className="bg-yellow-400 text-amber-900 px-3 py-1 rounded-full text-xs font-bold shadow">
                        New
                      </span>
                    </div>
                  </div>

                  {/* Milestone Cards */}
                  <div className="flex-1 flex items-center justify-between relative">
                    {/* Progress Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-3 bg-rose-950/50 rounded-full -translate-y-1/2">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full transition-all duration-500"
                        style={{ width: `${(currentLogins / 20) * 100}%` }}
                      />
                    </div>

                    {/* Milestone Markers */}
                    {[5, 10, 15, 20].map((milestone, idx) => (
                      <div key={milestone} className="relative z-10">
                        <div className="flex flex-col items-center">
                          <div className="relative">
                            <div className="w-20 h-28 bg-gradient-to-br from-amber-700 to-amber-900 rounded-lg flex items-center justify-center border-2 border-yellow-600 shadow-lg">
                              {milestone === 20 ? (
                                <div className="text-xs text-yellow-400 text-center px-1">Hero Card</div>
                              ) : (
                                <div className="text-4xl text-yellow-400">?</div>
                              )}
                            </div>
                            {milestone === 20 && (
                              <div className="absolute -top-2 -right-2 bg-yellow-400 text-amber-900 px-2 py-0.5 rounded text-xs font-bold shadow">
                                New
                              </div>
                            )}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center border-2 border-gray-500 text-white text-sm font-bold">
                              {milestone}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Grid Section */}
            <div className="bg-rose-950/30 rounded-2xl p-4 bg-[#e9e5da]">
              <div className="text-center font-serif italic text-lg mb-3 text-[#000000] font-bold bg-[#b35669]">
                Log in for 5 days to flip a card!
              </div>
              
              <div className="grid grid-cols-14 gap-2">
                {HERO_CARDS.map((card) => (
                  <div key={card.day} className="flex flex-col items-center">
                    <div className="text-xs text-rose-900/60 italic mb-1 font-bold text-[#756962]">{card.day}</div>
                    <div className="relative w-full aspect-[3/4]">
                      {card.claimed ? (
                        <div className="w-full h-full bg-gradient-to-br from-amber-200 to-amber-300 rounded-lg flex items-center justify-center border-2 border-amber-400">
                          <Check className="w-6 h-6 text-amber-700" />
                        </div>
                      ) : (
                        <div className={`w-full h-full rounded-lg border-2 overflow-hidden ${
                          card.unlocked 
                            ? 'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-300' 
                            : 'bg-gradient-to-br from-amber-700 to-amber-900 border-yellow-600'
                        }`}>
                          <div className="w-full h-full flex items-center justify-center">
                            {!card.unlocked && (
                              <div className="text-2xl text-yellow-400">?</div>
                            )}
                          </div>
                          {card.unlocked && card.badge && (
                            <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white ${
                              card.badge === 'gold' ? 'bg-yellow-500' :
                              card.badge === 'blue' ? 'bg-blue-500' :
                              'bg-green-500'
                            }`} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="h-24 bg-gradient-to-r from-rose-900/60 to-rose-800/60 flex items-center justify-center gap-4 px-6">
            <button className="bg-amber-100 hover:bg-amber-200 transition px-6 py-3 rounded-xl flex items-center justify-center shadow-lg min-w-[140px]">
              <span className="text-2xl">←</span>
            </button>
            
            <div className="flex-1 grid grid-cols-3 gap-4 max-w-4xl">
              <div className="bg-gradient-to-br from-rose-700 to-rose-900 rounded-xl p-3 text-center text-white shadow-lg hover:shadow-xl transition cursor-pointer">
                <div className="font-serif italic">Celebration Gift</div>
              </div>
              <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-xl p-3 text-center text-white shadow-lg hover:shadow-xl transition cursor-pointer">
                <div className="font-serif italic">Log in to Get Heroes</div>
              </div>
              <div className="bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl p-3 text-center text-white shadow-lg hover:shadow-xl transition cursor-pointer relative">
                <div className="font-serif italic">Zorya Rate Up</div>
                <div className="absolute -top-2 -right-2 bg-green-500 text-white px-2 py-0.5 rounded text-xs font-bold shadow">
                  New
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}