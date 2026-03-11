import { useEffect } from 'react';

interface SEOProps {
    title: string;
    description?: string;
}

const SEO: React.FC<SEOProps> = ({ title, description }) => {
    useEffect(() => {
        // Update title
        const prevTitle = document.title;
        document.title = title.includes('ULTRAKIDLE') ? title : `${title} | ULTRAKIDLE`;

        // Update meta description
        let metaDescription = document.querySelector('meta[name="description"]');
        let prevDescription = '';

        if (metaDescription) {
            prevDescription = metaDescription.getAttribute('content') || '';
            if (description) {
                metaDescription.setAttribute('content', description);
            }
        } else if (description) {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            metaDescription.setAttribute('content', description);
            document.head.appendChild(metaDescription);
        }

        // Cleanup on unmount (optional, but good for SPAs)
        return () => {
            document.title = prevTitle;
            if (metaDescription && prevDescription) {
                metaDescription.setAttribute('content', prevDescription);
            }
        };
    }, [title, description]);

    return null;
};

export default SEO;
