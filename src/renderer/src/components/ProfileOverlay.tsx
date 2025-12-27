import React, { useState } from 'react';
import { useBrowser } from '../context/BrowserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, LogOut, Check, Chrome, Shield } from 'lucide-react';

export function ProfileOverlay({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { state, dispatch } = useBrowser();
    const { profile } = state;
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(profile.name);

    const handleGoogleSignIn = () => {
        // In a real Chromium/Electron app, we just navigate to Google Login.
        // The session cookies are shared, so logging in once logs you in everywhere.
        dispatch({ type: 'NEW_TAB', payload: { url: 'https://accounts.google.com/signin' } });
        onClose();
    };

    const handleLogout = () => {
        dispatch({
            type: 'UPDATE_PROFILE',
            payload: {
                name: 'Guest',
                email: '',
                avatar: undefined,
                isAuthenticated: false
            }
        });
        // Optional: Clear storage/cookies for real logout
    };

    const saveName = () => {
        dispatch({ type: 'UPDATE_PROFILE', payload: { name: tempName } });
        setIsEditing(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    className="absolute top-16 right-4 w-80 bg-[#1a1a1e] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                >
                    {/* Header */}
                    <div className="h-32 bg-gradient-to-br from-blue-600 to-purple-600 relative p-6 flex flex-col justify-end">
                        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                            <X size={18} />
                        </button>

                        <div className="flex items-end gap-4 translate-y-8">
                            <div className="w-20 h-20 rounded-full bg-zinc-900 border-4 border-[#1a1a1e] flex items-center justify-center overflow-hidden shadow-xl">
                                {profile.avatar ? (
                                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={32} className="text-white/30" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="pt-10 pb-6 px-6">

                        {/* Name Field */}
                        <div className="mb-1">
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        value={tempName}
                                        onChange={e => setTempName(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500 w-full"
                                        autoFocus
                                        onKeyDown={e => e.key === 'Enter' && saveName()}
                                    />
                                    <button onClick={saveName} className="p-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30">
                                        <Check size={14} />
                                    </button>
                                </div>
                            ) : (
                                <h2
                                    className="text-xl font-bold text-white cursor-pointer hover:underline decoration-white/20 underline-offset-4"
                                    onClick={() => { setTempName(profile.name); setIsEditing(true); }}
                                >
                                    {profile.name}
                                </h2>
                            )}
                        </div>

                        <p className="text-white/40 text-sm mb-6">{profile.email || 'Not signed in'}</p>

                        {/* Cartoon Avatar Picker */}
                        <div className="mb-6">
                            <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Choose Avatar</h4>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar mask-gradient-right">
                                {[
                                    'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix',
                                    'https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka',
                                    'https://api.dicebear.com/9.x/adventurer/svg?seed=Zoey',
                                    'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Mario',
                                    'https://api.dicebear.com/9.x/notionists/svg?seed=Leo',
                                    'https://api.dicebear.com/9.x/micah/svg?seed=Caitlyn',
                                    'https://api.dicebear.com/9.x/avataaars/svg?seed=Jack',
                                    'https://api.dicebear.com/9.x/bottts/svg?seed=Cyber'
                                ].map((url, i) => (
                                    <button
                                        key={i}
                                        onClick={() => dispatch({ type: 'UPDATE_PROFILE', payload: { avatar: url } })}
                                        className={`flex-shrink-0 w-10 h-10 rounded-full bg-white/5 border-2 overflow-hidden transition-all hover:scale-110 ${profile.avatar === url ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/20' : 'border-transparent hover:border-white/20'}`}
                                    >
                                        <img src={url} alt="Avatar Option" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!profile.isAuthenticated ? (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleGoogleSignIn}
                                    className="w-full py-2.5 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                                >
                                    <Chrome size={18} />
                                    Sign in with Google
                                </button>
                                <p className="text-[10px] text-white/30 text-center leading-relaxed">
                                    Signing in syncs your Google services like YouTube and Gmail automatically across tabs.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-3">
                                    <Shield size={16} className="text-green-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-green-400 text-xs font-bold uppercase tracking-wide mb-1">Account Synced</h4>
                                        <p className="text-green-500/60 text-[10px]">
                                            You are signed in to Google services.
                                            YouTube and Gmail will log in automatically.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className="w-full py-2 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <LogOut size={16} />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
