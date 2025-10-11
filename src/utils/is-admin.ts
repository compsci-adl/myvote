export function isAdmin(session: { accessToken?: string }): boolean {
    if (!session?.accessToken) return false;
    try {
        const decodedToken = JSON.parse(atob(session.accessToken.split('.')[1]));
        return decodedToken?.realm_access?.roles?.includes('myvote-admin');
    } catch {
        return false;
    }
}
