import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, Sun, Moon, CloudRain, CloudSnow, CloudLightning, CloudFog, Wind, MapPin, X } from 'lucide-react';

interface WeatherData {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    isDay: number;
    fetchedAt: number;
}

const ENABLED_KEY = 'underlay-weather-enabled';
const CACHE_KEY = 'underlay-weather-cache';
const CACHE_MS = 20 * 60 * 1000;

function readCache(): WeatherData | null {
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as WeatherData | null;
        return cached && Date.now() - cached.fetchedAt < CACHE_MS ? cached : null;
    } catch {
        return null;
    }
}

function locate(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('unsupported'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { maximumAge: CACHE_MS, timeout: 15000 });
    });
}

async function fetchWeather(): Promise<WeatherData> {
    const { coords } = await locate();
    // Two decimals (~1 km) is plenty for weather and reveals less.
    const lat = coords.latitude.toFixed(2);
    const lon = coords.longitude.toFixed(2);
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day,weather_code,wind_speed_10m`);
    if (!res.ok) throw new Error(`weather ${res.status}`);
    const { current } = await res.json();
    const data: WeatherData = {
        temperature: current.temperature_2m,
        weatherCode: current.weather_code,
        windSpeed: current.wind_speed_10m,
        isDay: current.is_day,
        fetchedAt: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    return data;
}

function WeatherIcon({ code, isDay }: { code: number; isDay: number }) {
    const props = { size: 22, strokeWidth: 1.5 };
    if (code === 0) return isDay ? <Sun {...props} className="text-[#ffd60a]" /> : <Moon {...props} className="text-[#bfd7ff]" />;
    if (code <= 3) return <Cloud {...props} className="text-white/85" />;
    if (code <= 48) return <CloudFog {...props} className="text-white/70" />;
    if (code <= 67) return <CloudRain {...props} className="text-[#64d2ff]" />;
    if (code <= 77) return <CloudSnow {...props} className="text-white" />;
    if (code <= 82) return <CloudRain {...props} className="text-[#64d2ff]" />;
    if (code >= 95) return <CloudLightning {...props} className="text-[#ffd60a]" />;
    return <Cloud {...props} className="text-white/85" />;
}

/** Local weather on the start page. Off until the user turns it on. */
export function WeatherWidget() {
    const [enabled, setEnabled] = useState(() => localStorage.getItem(ENABLED_KEY) === '1');
    const [weather, setWeather] = useState<WeatherData | null>(readCache);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

    const load = useCallback(async () => {
        setStatus('loading');
        try {
            setWeather(await fetchWeather());
            setStatus('idle');
        } catch {
            setStatus('error');
        }
    }, []);

    useEffect(() => {
        if (enabled && !readCache()) load();
    }, [enabled, load]);

    const base = 'absolute top-8 right-8 z-20 animate-fade-in';

    if (!enabled) {
        return (
            <button
                className={`${base} flex items-center gap-1.5 px-3 h-8 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/45 text-[12px] font-medium transition-colors`}
                onClick={() => {
                    localStorage.setItem(ENABLED_KEY, '1');
                    setEnabled(true);
                }}
            >
                <Sun size={13} /> Show Weather
            </button>
        );
    }

    if (status === 'error' && !weather) {
        return (
            <div className={`${base} flex items-center gap-1 h-8 pl-3 pr-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-[12px] text-white/70`}>
                <button className="flex items-center gap-1.5 hover:text-white" onClick={load}>
                    <MapPin size={12} /> Location unavailable — Retry
                </button>
                <button
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10"
                    aria-label="Hide weather"
                    onClick={() => {
                        localStorage.removeItem(ENABLED_KEY);
                        setEnabled(false);
                        setStatus('idle');
                    }}
                >
                    <X size={12} />
                </button>
            </div>
        );
    }

    if (!weather) {
        return <div className={`${base} w-28 h-12 rounded-2xl bg-white/10 animate-pulse`} aria-label="Loading weather" />;
    }

    return (
        <div className={`${base} flex items-center gap-3 bg-black/30 backdrop-blur-md border border-white/10 pl-4 pr-3.5 py-2 rounded-2xl shadow-xl`}>
            <div className="flex flex-col items-end">
                <span className="text-[26px] font-light text-white tracking-tight leading-none tabular-nums">{Math.round(weather.temperature)}°</span>
                <span className="flex items-center gap-1 text-[10.5px] text-white/55 mt-0.5 tabular-nums">
                    <Wind size={9} /> {Math.round(weather.windSpeed)} km/h
                </span>
            </div>
            <div className="pl-3 border-l border-white/10">
                <WeatherIcon code={weather.weatherCode} isDay={weather.isDay} />
            </div>
        </div>
    );
}
