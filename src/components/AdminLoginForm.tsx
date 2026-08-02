'use client';

import {FormEvent, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';

export default function AdminLoginForm() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string>();
    const [isLoading, setIsLoading] = useState(false);

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

    return (
        <Center axis="both" width="100%" minHeight="100dvh">
            <VStack gap={4} width="100%" maxWidth={420} padding={4}>
                <VStack gap={1} hAlign="center">
                    <Text type="large" weight="bold">Alpha Colors</Text>
                    <Text type="supporting" color="secondary">Service OS</Text>
                </VStack>
                <Card padding={8} width="100%" elevation="low">
                    <form onSubmit={handleSubmit}>
                        <VStack gap={5}>
                            <VStack gap={1} hAlign="center">
                                <Heading level={1}>Admin access</Heading>
                                <Text type="supporting" color="secondary">
                                    Enter the shared admin password.
                                </Text>
                            </VStack>
                            <TextInput
                                label="Admin password"
                                type="password"
                                value={password}
                                onChange={(value) => {
                                    setPassword(value);
                                    setError(undefined);
                                }}
                                placeholder="Password"
                                size="lg"
                                hasAutoFocus
                                isRequired
                                status={error ? {type: 'error', message: error} : undefined}
                                statusVariant="detached"
                            />
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
                </Card>
            </VStack>
        </Center>
    );
}
