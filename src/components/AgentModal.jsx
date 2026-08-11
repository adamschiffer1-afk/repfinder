'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/AgentModal.module.css';
import { convertLink, SUPPORTED_AGENTS } from '@/utils/converter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

export default function AgentModal({ isOpen, product, onClose }) {
  const router = useRouter();
  const [selectedAgent, setSelectedAgent] = useState('ossbuy');

  // Load preferred agent from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('preferredAgent');
    if (saved) {
      const mapping = {
        'Ossbuy': 'ossbuy',
        'KakoBuy': 'kakobuy',
        'ACBuy': 'allchinabuy',
        'USFans': 'usfans',
        'LitBuy': 'litbuy',
        'GTBuy': 'gtbuy',
        'OopBuy': 'oopbuy',
        'MuleBuy': 'mulebuy',
        'HipoBuy': 'hipobuy'
      };
      setSelectedAgent(mapping[saved] || 'ossbuy');
    }
  }, []);

  const handleAgentClick = (agentValue) => {
    setSelectedAgent(agentValue);
  };

  const handleViewProduct = () => {
    router.push(`/products/${product.slug || product._id}`);
    onClose();
  };

  const handleOpenAgent = () => {
    const link = convertLink(product.link, selectedAgent);
    window.open(link, '_blank');
    
    // Track click
    try {
      fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product._id,
          type: 'product_click',
          agent: selectedAgent,
        })
      });
    } catch (err) {
      console.error('Stats tracking error:', err);
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <div className={styles.productInfo}>
          <img src={product.image} alt={product.name} className={styles.productImage} />
          <h3 className={styles.productName}>{product.name}</h3>
        </div>

        <div className={styles.agentSelection}>
          <h4 className={styles.sectionTitle}>Select Shopping Agent</h4>
          <div className={styles.agentGrid}>
            {SUPPORTED_AGENTS.map((agent) => (
              <button
                key={agent.value}
                className={`${styles.agentButton} ${selectedAgent === agent.value ? styles.agentButtonActive : ''}`}
                onClick={() => handleAgentClick(agent.value)}
              >
                <img src={agent.icon} alt={agent.label} className={styles.agentIcon} />
                <span>{agent.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.viewDetailsButton} onClick={handleViewProduct}>
            View Details
          </button>
          <button className={styles.openAgentButton} onClick={handleOpenAgent}>
            Open in {SUPPORTED_AGENTS.find(a => a.value === selectedAgent)?.label}
          </button>
        </div>
      </div>
    </div>
  );
}
