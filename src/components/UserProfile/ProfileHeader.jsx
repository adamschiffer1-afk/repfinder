'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faSave, faTimes, faCheckCircle, faStar, faComment, faChartBar } from '@fortawesome/free-solid-svg-icons';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import DOMPurify from 'dompurify';
import styles from '@/styles/UserProfile.module.css';

export default function ProfileHeader({ user, isOwner, onUpdateBio }) {
    const [isEditing, setIsEditing] = useState(false);
    const [bio, setBio] = useState(user.bio || '');
    const [tempBio, setTempBio] = useState('');

    useEffect(() => {
        setBio(user.bio || '');
    }, [user.bio]);

    const handleEdit = () => {
        setTempBio(bio);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setTempBio('');
    };

    const handleSave = async () => {
        const success = await onUpdateBio(tempBio);
        if (success) {
            setBio(tempBio);
            setIsEditing(false);
        }
    };

    return (
        <div className={styles.profileHeader}>
            <div className={styles.avatarWrapper}>
                <LazyLoadImage
                    src={user.avatar || '/default-avatar.png'}
                    alt={user.username}
                    effect="blur"
                    className={styles.avatar}
                />
            </div>

            <div className={styles.userInfo}>
                <h1 className={styles.username}>
                    {user.username}
                    {user.badges?.includes('Admin') && <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#00d9ff', fontSize: '1.2rem' }} title="Admin" />}
                </h1>

                {user.badges && user.badges.length > 0 && (
                    <div className={styles.badges}>
                        {user.badges.map((badge, index) => (
                            <span key={index} className={styles.badge}>{badge}</span>
                        ))}
                    </div>
                )}

                {user.levelData && (
                    <div className={styles.levelStats}>
                        <div className={styles.statItem} title="Poziom">
                            <FontAwesomeIcon icon={faStar} className={styles.statIcon} />
                            <span>Lvl {user.levelData.level}</span>
                        </div>
                        <div className={styles.statItem} title="Doświadczenie">
                            <FontAwesomeIcon icon={faChartBar} className={styles.statIcon} />
                            <span>{user.levelData.xp} / {user.levelData.totalXp} XP</span>
                        </div>
                        <div className={styles.statItem} title="Wiadomości">
                            <FontAwesomeIcon icon={faComment} className={styles.statIcon} />
                            <span>{user.levelData.messageCount} wiadomości</span>
                        </div>
                    </div>
                )}

                <div className={styles.bioSection}>
                    {isEditing ? (
                        <>
                            <textarea
                                className={styles.bioInput}
                                value={tempBio}
                                onChange={(e) => setTempBio(e.target.value)}
                                placeholder="Napisz coś o sobie..."
                                maxLength={500}
                            />
                            <div className={styles.bioActions}>
                                <button className={styles.saveBioBtn} onClick={handleSave}>
                                    <FontAwesomeIcon icon={faSave} className="me-2" />
                                    Zapisz
                                </button>
                                <button className={styles.cancelBioBtn} onClick={handleCancel}>
                                    <FontAwesomeIcon icon={faTimes} className="me-2" />
                                    Anuluj
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className={styles.bioText}>
                                {bio || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Ten użytkownik nie ma jeszcze opisu.</span>}
                            </p>
                            {isOwner && (
                                <button className={styles.editBioBtn} onClick={handleEdit}>
                                    <FontAwesomeIcon icon={faEdit} />
                                    Edytuj opis
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
