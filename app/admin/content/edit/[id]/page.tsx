import EditContentForm from './edit-form';

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return <EditContentForm id={resolvedParams.id} />;
}
