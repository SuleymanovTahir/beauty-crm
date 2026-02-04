import os

file_path = '/Users/tahir/Desktop/beauty-crm/frontend/src/components/shared/InternalChat.tsx'

with open(file_path, 'r') as f:
    lines = f.readlines()

# Generate bars for waveform mock (it will be constant per render)
# Using a fixed pattern so it looks like a real audio wave
new_trimmer_ui = """                              <div className="space-y-4">
                                <div className="group relative pt-6 pb-2">
                                  {/* Visual Track */}
                                  <div className="audio-trimmer-track">
                                    {/* Mock Waveform Bars */}
                                    <div className="absolute inset-0 flex items-center justify-between gap-[2px] px-2 opacity-30">
                                      {[...Array(40)].map((_, i) => (
                                        <div 
                                          key={i} 
                                          className="waveform-bar"
                                          style={{ height: `${20 + Math.abs(Math.sin(i * 0.3) * 60) + (i % 3 === 0 ? 15 : 0)}%` }}
                                        />
                                      ))}
                                    </div>

                                    {/* Selection Highlight */}
                                    <div 
                                      className="trim-selection"
                                      style={{ 
                                        left: `${(trimParams.startTime / 60) * 100}%`, 
                                        width: `${((trimParams.endTime - trimParams.startTime) / 60) * 100}%` 
                                      }}
                                    />
                                    
                                    {/* Start Handle (Range Input) */}
                                    <input 
                                      type="range" 
                                      min="0" 
                                      max="60" 
                                      step="0.1"
                                      value={trimParams.startTime}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setTrimParams(prev => ({ 
                                          ...prev, 
                                          startTime: Math.min(val, prev.endTime - 1) 
                                        }));
                                      }}
                                      className="dual-range-input z-30"
                                    />
                                    
                                    {/* End Handle (Range Input) */}
                                    <input 
                                      type="range" 
                                      min="0" 
                                      max="60" 
                                      step="0.1"
                                      value={trimParams.endTime}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setTrimParams(prev => ({ 
                                          ...prev, 
                                          endTime: Math.max(val, prev.startTime + 1) 
                                        }));
                                      }}
                                      className="dual-range-input z-20"
                                    />

                                    {/* Floating Time Labels */}
                                    <span 
                                      className="time-marker"
                                      style={{ left: `${(trimParams.startTime / 60) * 100}%`, transform: 'translateX(-50%)' }}
                                    >
                                      {trimParams.startTime.toFixed(1)}s
                                    </span>
                                    <span 
                                      className="time-marker"
                                      style={{ left: `${(trimParams.endTime / 60) * 100}%`, transform: 'translateX(-50%)' }}
                                    >
                                      {trimParams.endTime.toFixed(1)}s
                                    </span>
                                  </div>
                                </div>
                              </div>"""

# Target the lines where the two separate sliders were
# Looking for the block between "trim_range" label and the action buttons
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '<div className="space-y-4">' in line and 'startTime' in lines[max(0, i-20):i+50]:
        # Narrow down to the specific part inside trimming UI
        if 'trimmingRingtoneId === preset.id' in "".join(lines[max(0, i-10):i]):
            start_idx = i
            # Find the closing div of this specific space-y-4
            count = 1
            for j in range(i + 1, len(lines)):
                if '<div' in lines[j]: count += 1
                if '</div>' in lines[j]: count -= 1
                if count == 0:
                    end_idx = j + 1
                    break
            break

if start_idx != -1 and end_idx != -1:
    lines[start_idx:end_idx] = [new_trimmer_ui + '\n']
    with open(file_path, 'w') as f:
        f.writelines(lines)
    print(f"✅ Waveform trimmer updated at lines {start_idx}-{end_idx}")
else:
    print("❌ Could not find the trimmer UI block")
