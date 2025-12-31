import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, MapPin } from 'lucide-react';

interface WeatherData {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    humidity?: number; // specific to some endpoints
    isDay: number;
}

export function WeatherWidget() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [locationName, setLocationName] = useState('Locating...');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        console.log("WeatherWidget mounted. Geolocation supported:", !!navigator.geolocation);
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // 1. Get Weather Data (Open-Meteo, no API key needed)
                    // Added wind_speed_10m for extra detail
                    const weatherRes = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,is_day,weather_code,wind_speed_10m`
                    );
                    const weatherData = await weatherRes.json();

                    // 2. Get Location Name (Reverse Geocoding using bigdatacloud free api or similar, or just show coords)
                    // For speed/reliability without API keys, we might just show "Local Weather" or simple reverse geo if available.
                    // Let's use a simple lookup if possible, or fallback to generic.
                    // Actually, let's try to get a rough city name from the browser APIs or a public reverse geocode if possible.
                    // Using a very simple free reverse geocode endpoint often has rate limits.
                    // Let's settle for "Local Weather" to ensure stability unless we have a specific API.
                    setLocationName('Local Weather');

                    // Attempting basic reverse geocode via cached map or just storing coords
                    // Using Open-Meteo's geocoding API if available? 
                    // Let's just use the data we have.

                    setWeather({
                        temperature: weatherData.current.temperature_2m,
                        weatherCode: weatherData.current.weather_code,
                        windSpeed: weatherData.current.wind_speed_10m,
                        isDay: weatherData.current.is_day
                    });
                } catch (err) {
                    setError('Failed to fetch weather');
                } finally {
                    setLoading(false);
                }
            },
            () => {
                setError('Location access denied');
                setLoading(false);
            }
        );
    }, []);

    const getWeatherIcon = (code: number, isDay: number) => {
        // WMO Weather interpretation codes (WW)
        // 0: Clear sky
        // 1, 2, 3: Mainly clear, partly cloudy, and overcast
        // 45, 48: Fog
        // 51, 53, 55: Drizzle
        // 61, 63, 65: Rain
        // 71, 73, 75: Snow
        // 95: Thunderstorm

        const props = { size: 24, strokeWidth: 1.5, className: "text-white/90" };

        if (code === 0) return isDay ? <Sun {...props} className="text-yellow-400" /> : <Sun {...props} className="text-blue-200" />;
        if (code <= 3) return <Cloud {...props} className="text-white/80" />;
        if (code <= 48) return <Cloud {...props} className="text-gray-400" />;
        if (code <= 55) return <CloudRain {...props} className="text-blue-300" />;
        if (code <= 65) return <CloudRain {...props} className="text-blue-400" />;
        if (code <= 77) return <CloudSnow {...props} />;
        if (code >= 95) return <CloudLightning {...props} className="text-yellow-500" />;

        return <Sun {...props} />;
    };

    if (error) {
        return (
            <div className="absolute top-8 right-8 z-20 flex flex-col items-end animate-in fade-in slide-in-from-top-4 duration-700">
                <button
                    onClick={() => { setError(''); setLoading(true); navigator.geolocation.getCurrentPosition(() => { }, () => { }); }}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-2xl backdrop-blur-md hover:bg-red-500/20 transition-colors text-red-300 text-xs font-medium"
                >
                    <MapPin size={12} /> Enable Location
                </button>
            </div>
        );
    }

    if (loading) return (
        <div className="absolute top-8 right-8 z-20 flex items-center gap-2">
            <div className="animate-pulse bg-white/10 px-4 py-2 rounded-2xl border border-white/5 flex items-center justify-center">
                <span className="text-xs text-white/50 uppercase tracking-widest">Loading Weather...</span>
            </div>
        </div>
    );

    return (
        <div className="absolute top-8 right-8 z-20 flex flex-col items-end animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl shadow-xl hover:bg-black/60 transition-colors cursor-default group">
                <div className="flex flex-col items-end mr-1">
                    <span className="text-2xl font-light text-white tracking-tighter leading-none">
                        {Math.round(weather?.temperature || 0)}°
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-white/40 uppercase tracking-widest">
                        <Wind size={8} /> {weather?.windSpeed} km/h
                    </div>
                </div>
                <div className="pl-3 border-l border-white/10">
                    {weather && getWeatherIcon(weather.weatherCode, weather.isDay)}
                </div>
            </div>
            {/* Tooltip-like location name on hover */}
            <div className="mt-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white/30 uppercase tracking-[0.2em] flex items-center gap-1 justify-end">
                <MapPin size={8} /> {locationName}
            </div>
        </div>
    );
}
