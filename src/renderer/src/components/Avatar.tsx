import React from 'react';

// Avatars are drawn locally (no third-party image service sees the user).
// A profile's `avatar` is either a data: URL (e.g. the Google photo the main
// process downloaded) or one of these gradient presets.
export const AVATAR_PRESETS: Record<string, string> = {
    'preset:ocean': 'linear-gradient(135deg, #5ac8fa 0%, #007aff 100%)',
    'preset:violet': 'linear-gradient(135deg, #bf5af2 0%, #5e5ce6 100%)',
    'preset:sunset': 'linear-gradient(135deg, #ffcc00 0%, #ff6b3d 100%)',
    'preset:rose': 'linear-gradient(135deg, #ff7eb3 0%, #ff375f 100%)',
    'preset:mint': 'linear-gradient(135deg, #63e6be 0%, #30b0c7 100%)',
    'preset:forest': 'linear-gradient(135deg, #a8e063 0%, #34c759 100%)',
    'preset:graphite': 'linear-gradient(135deg, #8e8e93 0%, #3a3a3c 100%)'
};

export const DEFAULT_AVATAR = 'preset:ocean';

export function initialsOf(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

interface AvatarProps {
    name: string;
    avatar?: string;
    size?: number;
    className?: string;
}

export const Avatar = React.memo(function Avatar({ name, avatar, size = 28, className = '' }: AvatarProps) {
    const style: React.CSSProperties = { width: size, height: size, fontSize: Math.round(size * 0.4) };

    if (avatar?.startsWith('data:image/')) {
        return <img src={avatar} alt="" draggable={false} style={style} className={`rounded-full object-cover select-none ${className}`} />;
    }

    const initials = initialsOf(name);
    return (
        <div
            style={{ ...style, background: AVATAR_PRESETS[avatar ?? ''] ?? AVATAR_PRESETS[DEFAULT_AVATAR] }}
            className={`rounded-full flex items-center justify-center text-white font-semibold tracking-tight select-none shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.25)] ${className}`}
            aria-hidden
        >
            {initials || (
                <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="currentColor" opacity={0.9}>
                    <circle cx="12" cy="8.5" r="4.5" />
                    <path d="M3.5 21c.9-4.3 4.4-7 8.5-7s7.6 2.7 8.5 7z" />
                </svg>
            )}
        </div>
    );
});

/** What to show for the current user: local choices win over the Google account. */
export function displayIdentity(profile: { name: string; avatar?: string }, account: GoogleAccount | null) {
    return {
        name: profile.name || account?.name || '',
        avatar: profile.avatar ?? account?.avatar
    };
}
