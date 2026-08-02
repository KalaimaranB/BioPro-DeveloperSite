'use client';

import { useState } from 'react';
import styles from './RegisterModuleForm.module.css';

// Using a Client component for state, but the submission could be a Server Action
export default function RegisterModuleForm({ 
  action 
}: { 
  action: (formData: FormData) => Promise<void> 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      await action(formData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while registering the module.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.title}>Register New Module</h2>
      <p className={styles.description}>
        Reserve your namespace and link your GitHub repository.
      </p>

      <form onSubmit={handleSubmit}>


        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="pluginName">
            Plugin Name
          </label>
          <input
            type="text"
            id="pluginName"
            name="pluginName"
            className={styles.input}
            placeholder="e.g., genome-analyzer"
            required
            pattern="^[a-zA-Z0-9\\-]+$"
            title="Alphanumeric characters and hyphens only"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="description">
            Short Description
          </label>
          <textarea
            id="description"
            name="description"
            className={styles.textarea}
            placeholder="What does this module do?"
            maxLength={255}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="repositoryUrl">
            GitHub Repository URL
          </label>
          <input
            type="url"
            id="repositoryUrl"
            name="repositoryUrl"
            className={styles.input}
            placeholder="https://github.com/username/repo"
            required
          />
        </div>

        {error && (
          <div style={{ color: 'var(--accent-danger)', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(248, 81, 73, 0.1)', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          className={styles.button}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Registering...' : 'Register Module'}
        </button>
      </form>
    </div>
  );
}
