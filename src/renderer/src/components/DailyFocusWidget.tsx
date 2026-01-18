import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2 } from 'lucide-react';

export function DailyFocusWidget() {
    const [focus, setFocus] = useState('');
    const [isSet, setIsSet] = useState(false);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('daily-focus');
        const savedDate = localStorage.getItem('daily-focus-date');
        const savedCompleted = localStorage.getItem('daily-focus-completed');
        const today = new Date().toDateString();

        if (saved && savedDate === today) {
            setFocus(saved);
            setIsSet(true);
            setCompleted(savedCompleted === 'true');
        } else {
            // Reset if new day
            localStorage.removeItem('daily-focus');
            localStorage.removeItem('daily-focus-completed');
        }
    }, []);

    const handleSet = (e: React.FormEvent) => {
        e.preventDefault();
        if (focus.trim()) {
            setIsSet(true);
            localStorage.setItem('daily-focus', focus);
            localStorage.setItem('daily-focus-date', new Date().toDateString());
        }
    };

    const toggleComplete = () => {
        const newState = !completed;
        setCompleted(newState);
        localStorage.setItem('daily-focus-completed', String(newState));
    };

    const clearFocus = () => {
        setFocus('');
        setIsSet(false);
        setCompleted(false);
        localStorage.removeItem('daily-focus');
        localStorage.removeItem('daily-focus-completed');
    };

    return (
        <div className="w-full max-w-lg mx-auto mt-8 mb-4 text-center z-10 relative">
            {!isSet ? (
                <form onSubmit={handleSet} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h3 className="text-xl text-white font-light tracking-wide mb-2 opacity-80">What is your main focus for today?</h3>
                    <input
                        type="text"
                        value={focus}
                        onChange={(e) => setFocus(e.target.value)}
                        className="bg-transparent border-b-2 border-white/20 text-center text-2xl text-white outline-none w-full py-2 focus:border-white/60 transition-colors placeholder-white/10"
                        autoFocus
                    />
                </form>
            ) : (
                <div className="animate-in fade-in zoom-in-95 duration-500 group">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Today</h3>
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={toggleComplete}
                            className={`flex items-center gap-3 text-2xl font-light transition-all duration-300 ${completed ? 'line-through text-white/30 decoration-white/30' : 'text-white'}`}
                        >
                            <span className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${completed ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-white'}`}>
                                {completed && <CheckCircle2 size={16} className="text-black" />}
                            </span>
                            {focus}
                        </button>
                        <button
                            onClick={clearFocus}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-white"
                            title="Clear"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
