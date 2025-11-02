import React from "react";
import { Box, Typography, Button } from "@mui/material";

const TutorialTooltip = ({ text, onNext, buttonText = "Next", top = "50%", left = "50%" }) => {
    return (
        <Box
            sx={{
                pointerEvents: "auto",
                position: "fixed",
                top,
                left,
                transform: "translate(-50%, -50%)",
                bgcolor: "rgba(10,20,40,0.9)",
                p: 3,
                borderRadius: 2,
                boxShadow: "0 0 15px #4FC3F7",
                maxWidth: 350,
                textAlign: "center",
                zIndex: 3001,
            }}
        >
            <Typography variant="body1" sx={{ color: "#fff", mb: 2 }}>
                {text}
            </Typography>

            {onNext && (
                <Button
                    variant="contained"
                    onClick={onNext}
                    sx={{
                        backgroundColor: "#4FC3F7",
                        color: "#000",
                        fontWeight: "bold",
                        "&:hover": {
                            backgroundColor: "#29B6F6",
                        },
                    }}
                >
                    {buttonText}
                </Button>
            )}
        </Box>
    );
};

export default TutorialTooltip;