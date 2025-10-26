import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import InfoModal from "./InfoModal";
import TutorialTooltip from "./TutorialTooltip";
import { tooltips } from "../constants";

const Tutorial = ({ start, onFinish, panel1Year, setTutorialStep }) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (step === 2 && panel1Year === 2050) {
            setTimeout(() => setStep(3), 600);
        }
        setTutorialStep?.(step);
    }, [panel1Year, step, setTutorialStep]);

    if (!start) return null;

    return (
        <Box>
            {/* Step 0 - Welcome */}
            <InfoModal
                open={step === 0}
                onClose={() => setStep(1)}
                title="Welcome to the MAPMAKER Tutorial"
                shortText="Learn how to explore plankton diversity scenarios."
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

            {/* Step 4 - Completion */}
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
