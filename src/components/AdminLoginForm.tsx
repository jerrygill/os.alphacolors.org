'use client';

import {FormEvent, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AppShell} from '@astryxdesign/core/AppShell';
import {Button} from '@astryxdesign/core/Button';
import {Grid, GridSpan} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {InputGroup, InputGroupText} from '@astryxdesign/core/InputGroup';
import {Section} from '@astryxdesign/core/Section';
import {VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {Eye, EyeOff} from 'lucide-react';
import styles from './ServiceOS.module.css';

function AdminBrandPanel({isCompact = false}: {isCompact?: boolean}) {
    return (
        <div className={isCompact ? styles.adminBrandMobile : styles.adminBrandPanel}>
            <Section variant={'brand' as never} padding={isCompact ? 4 : 8} width="100%" height="100%">
                <VStack gap={8} height="100%" vAlign="between">
                    <div className={styles.adminBrandName}>
                        <Text type="display-3" weight="bold" color="inherit">Alpha Colors</Text>
                    </div>
                    <div className={styles.adminBrandTitle}>
                        <Text type="display-1" weight="bold" color="inherit">
                            Service<br />OS
                        </Text>
                    </div>
                </VStack>
            </Section>
        </div>
    );
}

export default function AdminLoginForm() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [error, setError] = useState<string>();
    const [isLoading, setIsLoading] = useState(false);
    const isWideLayout = useMediaQuery('(min-width: 900px)');

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError(undefined);

        try {
            const response = await fetch('/api/admin/session', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({password}),
            });
            const result = await response.json().catch(() => ({})) as {error?: string};

            if (!response.ok) {
                setError(result.error || 'Unable to sign in.');
                return;
            }

            router.replace('/admin');
            router.refresh();
        } catch {
            setError('Unable to reach the server. Try again.');
        } finally {
            setIsLoading(false);
        }
    }

    const loginPanel = (
        <div className={styles.adminFormPanel}>
            <div className={styles.adminFormFrame}>
                <VStack gap={6}>
                    <VStack gap={3}>
                        <div className={styles.utilityLabel}>
                            <Text type="label" weight="bold">Service OS</Text>
                        </div>
                        <div className={styles.adminHeading}>
                            <Heading level={1} type="display-1">Admin access</Heading>
                        </div>
                        <Text type="large" color="secondary">
                            Enter the shared admin password.
                        </Text>
                    </VStack>
                    <form onSubmit={handleSubmit}>
                        <VStack gap={5}>
                            <InputGroup
                                label="Admin password"
                                size="lg"
                                isRequired
                                status={error ? {type: 'error', message: error} : undefined}
                            >
                                <TextInput
                                    label="Admin password"
                                    isLabelHidden
                                    type={isPasswordVisible ? 'text' : 'password'}
                                    value={password}
                                    onChange={(value) => {
                                        setPassword(value);
                                        setError(undefined);
                                    }}
                                    placeholder="Password"
                                    hasAutoFocus
                                />
                                <InputGroupText>
                                    <IconButton
                                        label={isPasswordVisible ? 'Hide password' : 'Show password'}
                                        tooltip={isPasswordVisible ? 'Hide password' : 'Show password'}
                                        icon={<Icon icon={isPasswordVisible ? EyeOff : Eye} />}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsPasswordVisible((visible) => !visible)}
                                    />
                                </InputGroupText>
                            </InputGroup>
                            <Button
                                label="Continue"
                                type="submit"
                                variant="primary"
                                size="lg"
                                width="100%"
                                isLoading={isLoading}
                                isDisabled={!password}
                            />
                        </VStack>
                    </form>
                </VStack>
            </div>
        </div>
    );

    return (
        <div className={styles.adminPage}>
            <AppShell height="fill" contentPadding={0} mobileNav={false} variant="surface">
                {isWideLayout ? (
                    <Grid columns={5} gap={0} height="100dvh">
                        <GridSpan columns={2}><AdminBrandPanel /></GridSpan>
                        <GridSpan columns={3}>{loginPanel}</GridSpan>
                    </Grid>
                ) : (
                    <VStack gap={0} minHeight="100dvh">
                        <AdminBrandPanel isCompact />
                        {loginPanel}
                    </VStack>
                )}
            </AppShell>
        </div>
    );
}
