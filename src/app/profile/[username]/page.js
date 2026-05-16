import UserProfile from '@/components/UserProfile/UserProfile';

export default async function ProfilePage({ params }) {
    const { username } = await params;
    return <UserProfile username={username} />;
}
