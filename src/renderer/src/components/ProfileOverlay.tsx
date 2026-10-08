import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, LogOut, Pencil, ExternalLink, Loader2 } from 'lucide-react';
import { dispatch, useBrowserState } from '../context/BrowserContext';
import { Avatar, AVATAR_PRESETS, displayIdentity } from './Avatar';

const GoogleMark = () => (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
        <path fill="#FBBC05" d="M10.6 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-8 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
);

/** Account popover anchored under the profile button, like Safari's. */
export function ProfileOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { profile, account } = useBrowserState(s => ({ profile: s.profile, account: s.account }));
    const identity = displayIdentity(profile, account);
    const ref = useRef<HTMLDivElement>(null);

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [signingOut, setSigningOut] = useState(false);
    const [confirmSignOut, setConfirmSignOut] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setEditing(false);
            setConfirmSignOut(false);
            return;
        }
        window.electron?.account.refresh().catch(() => { });
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as HTMLElement;
            // The toolbar button toggles the popover itself.
            if (ref.current?.contains(target) || target.closest?.('[data-panel-toggle="profile"]')) return;
            onClose();
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        const timer = setTimeout(() => window.addEventListener('pointerdown', onPointerDown));
        window.addEventListener('keydown', onKey);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [isOpen, onClose]);

    const saveName = () => {
        dispatch({ type: 'UPDATE_PROFILE', payload: { name: draft.trim().slice(0, 40) } });
        setEditing(false);
    };

    const signIn = async () => {
        const url = await window.electron.account.getSignInUrl();
        dispatch({ type: 'NEW_TAB', payload: { url } });
        onClose();
    };

    const signOut = async () => {
        setSigningOut(true);
        try {
            await window.electron.account.signOut();
            // If the avatar came from Google, drop it along with the account.
            if (profile.avatar === account?.avatar) dispatch({ type: 'UPDATE_PROFILE', payload: { avatar: undefined } });
        } finally {
            setSigningOut(false);
            setConfirmSignOut(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
                    transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                    className="popover fixed top-[92px] right-3 w-[320px] z-[100] overflow-hidden text-underlay-text origin-top-right"
                    role="dialog"
                    aria-label="Profile"
                >
                    {/* Identity */}
                    <div className="flex flex-col items-center px-5 pt-6 pb-5 text-center">
                        <Avatar name={identity.name} avatar={identity.avatar} size={64} className="mb-3" />
                        {editing ? (
                            <form className="flex items-center gap-1.5 w-full" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
                                <input
                                    autoFocus
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setEditing(false))}
                                    placeholder={account?.name ?? 'Your name'}
                                    maxLength={40}
                                    className="text-field h-8 text-center"
                                />
                                <button type="submit" className="icon-button shrink-0 !text-underlay-accent" aria-label="Save name">
                                    <Check size={16} />
                                </button>
                            </form>
                        ) : (
                            <button
                                onClick={() => { setDraft(profile.name); setEditing(true); }}
                                className="group flex items-center gap-1.5 max-w-full text-[15px] font-semibold tracking-tight rounded-md px-1.5 -mx-1.5 hover:bg-underlay-text/[0.06]"
                                title="Edit name"
                            >
                                <span className="truncate">{identity.name || 'Add your name'}</span>
                                <Pencil size={12} className="shrink-0 text-underlay-text/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        )}
                        <p className="mt-0.5 text-[12px] text-underlay-text/50 truncate max-w-full">
                            {account ? account.email : 'This profile is stored only on this device'}
                        </p>
                    </div>

                    {/* Appearance */}
                    <div className="px-5 pb-4">
                        <div className="section-label mb-2">Picture</div>
                        <div className="flex items-center gap-2">
                            {account?.avatar && (
                                <AvatarChoice
                                    selected={profile.avatar === undefined || profile.avatar === account.avatar}
                                    onSelect={() => dispatch({ type: 'UPDATE_PROFILE', payload: { avatar: undefined } })}
                                    label="Google photo"
                                >
                                    <Avatar name={identity.name} avatar={account.avatar} size={30} />
                                </AvatarChoice>
                            )}
                            {Object.keys(AVATAR_PRESETS).map(preset => (
                                <AvatarChoice
                                    key={preset}
                                    selected={(profile.avatar ?? (account?.avatar ? undefined : 'preset:ocean')) === preset}
                                    onSelect={() => dispatch({ type: 'UPDATE_PROFILE', payload: { avatar: preset } })}
                                    label={preset.replace('preset:', '')}
                                >
                                    <Avatar name={identity.name} avatar={preset} size={30} />
                                </AvatarChoice>
                            ))}
                        </div>
                    </div>

                    {/* Account */}
                    <div className="border-t hairline px-5 py-4">
                        {account ? (
                            <>
                                <div className="flex items-center gap-2 text-[12px] text-underlay-text/60 mb-3">
                                    <GoogleMark />
                                    <span>Signed in to Google in all non-private tabs</span>
                                </div>
                                {confirmSignOut ? (
                                    <div className="rounded-lg bg-underlay-text/[0.05] p-3">
                                        <p className="text-[12px] leading-snug text-underlay-text/70 mb-3">
                                            You'll be signed out of Google, Gmail, YouTube and other Google sites in this browser.
                                        </p>
                                        <div className="flex gap-2">
                                            <button className="btn-secondary flex-1" onClick={() => setConfirmSignOut(false)}>Cancel</button>
                                            <button className="btn-destructive flex-1" onClick={signOut} disabled={signingOut}>
                                                {signingOut ? <Loader2 size={14} className="animate-spin" /> : 'Sign Out'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            className="btn-secondary flex-1"
                                            onClick={() => { dispatch({ type: 'NEW_TAB', payload: { url: 'https://myaccount.google.com/' } }); onClose(); }}
                                        >
                                            <ExternalLink size={13} /> Manage Account
                                        </button>
                                        <button className="btn-secondary flex-1" onClick={() => setConfirmSignOut(true)}>
                                            <LogOut size={13} /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <button onClick={signIn} className="btn-secondary w-full h-9">
                                    <GoogleMark /> Sign in with Google
                                </button>
                                <p className="mt-2 text-[11px] leading-snug text-center text-underlay-text/45">
                                    Signs you in to Gmail, YouTube and other Google sites. Your browsing data stays on this device.
                                </p>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function AvatarChoice({ selected, onSelect, label, children }: { selected: boolean; onSelect: () => void; label: string; children: React.ReactNode }) {
    return (
        <button
            onClick={onSelect}
            aria-label={label}
            aria-pressed={selected}
            className={`rounded-full p-[2px] transition-shadow duration-150 ${selected ? 'shadow-[0_0_0_2px_rgb(var(--underlay-accent))]' : 'hover:shadow-[0_0_0_2px_rgb(var(--underlay-text)/0.2)]'}`}
        >
            {children}
        </button>
    );
}
