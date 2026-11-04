import { useEffect, useState } from 'react';

export default function useSpeakingRecordingPreview(audioBlob) {
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!audioBlob) {
            setPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(audioBlob);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [audioBlob]);

    return previewUrl;
}
