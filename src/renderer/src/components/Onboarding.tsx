import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBrowser } from '../context/BrowserContext';
import { ArrowRight, Check, Moon, Sun, Monitor, Shield, Zap, Info } from 'lucide-react';
import { getPlatformElectron } from '../utils/PlatformUtils';

interface OnboardingProps {
    onComplete: () => void;
}

// Animation Variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    },
    exit: { opacity: 0, transition: { duration: 0.2 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring" as const, stiffness: 300, damping: 24 }
    }
};

const logoVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 200,
            damping: 20
        }
    },
    float: {
        y: [0, -10, 0],
        rotate: [0, 5, -5, 0],
        transition: {
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut" as const
        }
    }
};

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const { state, dispatch } = useBrowser();

    const handleNext = () => setStep(s => s + 1);

    const handleFinish = async () => {
        const electron = getPlatformElectron();
        await electron.onboarding.complete();
        onComplete();
    };

    const steps = [
        // STEP 0: WELCOME
        <motion.div
            key="step-0"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center justify-center text-center space-y-8 max-w-lg"
        >
            <motion.div
                variants={logoVariants}
                animate={["visible", "float"]}
                className="w-32 h-32 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.3)] mb-4 ring-1 ring-white/10 backdrop-blur-xl"
            >
                <span className="text-6xl font-bold text-white drop-shadow-md">U</span>
            </motion.div>

            <div className="space-y-4">
                <motion.h1 variants={itemVariants} className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tight">
                    Underlay
                </motion.h1>
                <motion.p variants={itemVariants} className="text-xl text-white/70 leading-relaxed">
                    The browser effectively built for <span className="text-blue-400 font-medium">focus</span> and <span className="text-purple-400 font-medium">performance</span>.
                </motion.p>
            </div>

            <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className="group mt-12 px-10 py-4 bg-white/10 backdrop-blur-md border border-white/10 text-white font-semibold rounded-full flex items-center gap-3 hover:bg-white/20 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
                Get Started <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
        </motion.div>,

        // STEP 1: FEATURES (Context)
        <motion.div
            key="step-1"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center justify-center text-center space-y-10 max-w-4xl w-full"
        >
            <motion.h2 variants={itemVariants} className="text-4xl font-bold text-white">Why Underlay?</motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-8">
                <motion.div
                    variants={itemVariants}
                    className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-start text-left gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="p-3 bg-green-500/20 rounded-xl text-green-400">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Privacy First</h3>
                        <p className="text-white/60">Built-in tracker blocking and fingerprint protection keeps your data safe without extensions.</p>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-start text-left gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400">
                        <Zap size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Blazing Fast</h3>
                        <p className="text-white/60">Optimized rendering engine with zero bloat. Resource suspension for inactive tabs saves memory.</p>
                    </div>
                </motion.div>
            </div>

            <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className="mt-8 px-10 py-4 bg-white text-black font-semibold rounded-full flex items-center gap-3 hover:bg-gray-200 transition-colors shadow-xl"
            >
                Next Step <ArrowRight size={20} />
            </motion.button>
        </motion.div>,

        // STEP 2: THEME
        <motion.div
            key="step-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center justify-center text-center space-y-10"
        >
            <motion.h2 variants={itemVariants} className="text-4xl font-bold text-white">Choose Your Aesthetic</motion.h2>

            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                {[
                    { id: 'light', icon: Sun, label: 'Light', desc: 'Clean & Bright' },
                    { id: 'dark', icon: Moon, label: 'Dark', desc: 'Easy on Eyes' },
                    { id: 'system', icon: Monitor, label: 'System', desc: 'Syncs with OS' }
                ].map((th) => (
                    <motion.button
                        key={th.id}
                        onClick={() => dispatch({ type: 'SET_SETTING', payload: { key: 'theme', value: th.id } })}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-6 rounded-3xl border flex flex-col items-center gap-4 transition-all duration-300 relative overflow-hidden group ${state.settings.theme === th.id
                            ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        <div className={`p-4 rounded-full ${state.settings.theme === th.id ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60 group-hover:text-white'}`}>
                            <th.icon size={28} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className={`font-bold text-lg ${state.settings.theme === th.id ? 'text-white' : 'text-white/80'}`}>{th.label}</span>
                            <span className="text-xs text-white/40 font-medium">{th.desc}</span>
                        </div>
                    </motion.button>
                ))}
            </motion.div>

            <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className="mt-8 px-10 py-4 bg-white text-black font-semibold rounded-full flex items-center gap-3 hover:bg-gray-200 transition-colors shadow-xl"
            >
                Confirm Style <ArrowRight size={20} />
            </motion.button>
        </motion.div>,

        // STEP 3: COMPLETE
        <motion.div
            key="step-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center justify-center text-center space-y-8"
        >
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] mb-2"
            >
                <Check size={48} className="text-white stroke-[3px]" />
            </motion.div>

            <div className="space-y-4">
                <motion.h2 variants={itemVariants} className="text-4xl font-bold text-white">You're Ready to Go</motion.h2>
                <motion.p variants={itemVariants} className="text-xl text-white/60 max-w-md">
                    Explore the web with a new perspective.
                </motion.p>
            </div>

            <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFinish}
                className="mt-12 px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-full flex items-center gap-3 hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-shadow"
            >
                Enter Browser
            </motion.button>
        </motion.div>
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-[#0f0f11] flex items-center justify-center overflow-hidden">
            {/* Dynamic Background Mesh */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
                <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
            </div>

            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0"></div>

            <div className="relative z-10 w-full max-w-5xl p-8 flex flex-col items-center min-h-[600px] justify-center">
                <AnimatePresence mode="wait">
                    {steps[step]}
                </AnimatePresence>
            </div>

            {/* Pagination Dots */}
            <div className="absolute bottom-12 flex gap-4 z-20">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 transition-all duration-500 rounded-full ${i === step ? 'w-12 bg-white' : 'w-2 bg-white/20'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};
