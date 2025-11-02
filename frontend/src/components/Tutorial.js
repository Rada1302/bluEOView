import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import InfoModal from "./InfoModal";
import TutorialTooltip from "./TutorialTooltip";
import { tooltips } from "../constants";

const Tutorial = ({ start, onFinish, setTutorialStep }) => {
    const [step, setStep] = useState(0);
    if (!start) return null;

    return (
        <Box>
            {/* Step 0 - Welcome */}
            <InfoModal
                open={step === 0}
                onClose={() => setStep(1)}
                title="Welcome to the BLUEOVIEW Tutorial"
                shortText="Learn how to explore different features."
                buttonText="Start Tutorial"
            />

            {/* Dark overlay for all tooltip steps */}
            {step > 0 && step < 9 && (
                <>
                    <Box
                        sx={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            backgroundColor: "rgba(0,0,0,0.7)",
                            zIndex: 2999,
                            pointerEvents: "none",
                        }}
                    />

                    {tooltips[step] && (
                        <TutorialTooltip
                            text={tooltips[step].text}
                            onNext={() => setStep(step + 1)}
                            buttonText="Next"
                            top={tooltips[step].top}
                            left={tooltips[step].left}
                        />
                    )}
                </>
            )}

            {/* Last Step -- Completion */}
            <InfoModal
                open={step === 9}
                onClose={() => {
                    setStep(0);
                    onFinish();
                }}
                title="Congratulations, you’ve completed the tutorial!"
                shortText="You can revisit it anytime by clicking the “Start Tutorial” button. Have fun exploring the website!"
            />
        </Box>
    );
};

export default Tutorial;