'use client';

import { useEffect, useState } from 'react';
import styles from '@/styles/SnowEffect.module.css';

export default function SnowEffect() {
    const [snowflakes, setSnowflakes] = useState([]);

    useEffect(() => {
        const count = 50; // Number of snowflakes
        const flakes = [];
        for (let i = 0; i < count; i++) {
            flakes.push({
                id: i,
                left: Math.random() * 100 + '%',
                animationDuration: Math.random() * 3 + 2 + 's',
                animationDelay: Math.random() * 5 + 's',
                opacity: Math.random() * 0.5 + 0.3,
                size: Math.random() * 5 + 2 + 'px',
            });
        }
        setSnowflakes(flakes);
    }, []);

    return (
        <div className={styles.snowContainer}>
            {snowflakes.map((flake) => (
                <div
                    key={flake.id}
                    className={styles.snowflake}
                    style={{
                        left: flake.left,
                        animationDuration: flake.animationDuration,
                        animationDelay: flake.animationDelay,
                        opacity: flake.opacity,
                        width: flake.size,
                        height: flake.size,
                    }}
                />
            ))}
        </div>
    );
}
