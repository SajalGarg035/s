import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    FiUser, FiMail, FiCalendar, FiEdit2, FiSave, FiX, FiCamera, 
    FiCode, FiUsers, FiClock, FiMapPin, FiGlobe, FiGithub,
    FiSettings, FiShield, FiBell, FiEye, FiTrendingUp,
    FiActivity, FiAward, FiStar, FiArrowLeft, FiExternalLink,
    FiRefreshCw, FiCheckCircle, FiAlertCircle, FiBarChart2,
    FiTarget, FiZap, FiGift
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const Profile = () => {
    const { user, updateProfile, logout } = useAuth();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    
    // Coding profiles state
    const [codingProfiles, setCodingProfiles] = useState({
        codeforces: { username: '', data: null, loading: false, error: null },
        leetcode: { username: '', data: null, loading: false, error: null }
    });
    const [editingCodingProfiles, setEditingCodingProfiles] = useState(false);
    
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        bio: user?.bio || '',
        location: user?.location || '',
        website: user?.website || '',
        company: user?.company || '',
        jobTitle: user?.jobTitle || '',
        skills: user?.skills?.join(', ') || '',
        socialLinks: {
            github: user?.socialLinks?.github || '',
            linkedin: user?.socialLinks?.linkedin || '',
            twitter: user?.socialLinks?.twitter || ''
        },
        codingProfiles: {
            codeforces: user?.codingProfiles?.codeforces || '',
            leetcode: user?.codingProfiles?.leetcode || ''
        }
    });

    // Initialize coding profiles on component mount
    useEffect(() => {
        if (user?.codingProfiles) {
            setCodingProfiles(prev => ({
                codeforces: { 
                    ...prev.codeforces, 
                    username: user.codingProfiles.codeforces || '' 
                },
                leetcode: { 
                    ...prev.leetcode, 
                    username: user.codingProfiles.leetcode || '' 
                }
            }));
            
            // Auto-fetch data if usernames exist
            if (user.codingProfiles.codeforces) {
                fetchCodeforcesData(user.codingProfiles.codeforces);
            }
            if (user.codingProfiles.leetcode) {
                fetchLeetCodeData(user.codingProfiles.leetcode);
            }
        }
    }, [user]);

    // Codeforces API integration
    const fetchCodeforcesData = async (username) => {
        if (!username.trim()) return;
        
        setCodingProfiles(prev => ({
            ...prev,
            codeforces: { ...prev.codeforces, loading: true, error: null }
        }));

        try {
            // Fetch user info
            const userResponse = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);
            const userData = await userResponse.json();

            if (userData.status !== 'OK') {
                throw new Error('User not found');
            }

            // Fetch user submissions
            const submissionsResponse = await fetch(`https://codeforces.com/api/user.status?handle=${username}&from=1&count=100`);
            const submissionsData = await submissionsResponse.json();

            // Fetch user rating history
            const ratingResponse = await fetch(`https://codeforces.com/api/user.rating?handle=${username}`);
            const ratingData = await ratingResponse.json();

            const user = userData.result[0];
            const submissions = submissionsData.status === 'OK' ? submissionsData.result : [];
            const ratings = ratingData.status === 'OK' ? ratingData.result : [];

            // Process submissions
            const solvedProblems = new Set();
            const languageStats = {};
            const verdictStats = {};

            submissions.forEach(submission => {
                if (submission.verdict === 'OK') {
                    solvedProblems.add(`${submission.problem.contestId}-${submission.problem.index}`);
                }
                
                languageStats[submission.programmingLanguage] = 
                    (languageStats[submission.programmingLanguage] || 0) + 1;
                
                verdictStats[submission.verdict] = 
                    (verdictStats[submission.verdict] || 0) + 1;
            });

            const processedData = {
                profile: {
                    handle: user.handle,
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    country: user.country || '',
                    city: user.city || '',
                    organization: user.organization || '',
                    rank: user.rank || 'unrated',
                    maxRank: user.maxRank || 'unrated',
                    rating: user.rating || 0,
                    maxRating: user.maxRating || 0,
                    titlePhoto: user.titlePhoto || '',
                    avatar: user.avatar || '',
                    registrationTimeSeconds: user.registrationTimeSeconds
                },
                statistics: {
                    totalSubmissions: submissions.length,
                    solvedProblems: solvedProblems.size,
                    acceptedSubmissions: verdictStats['OK'] || 0,
                    wrongAnswerSubmissions: verdictStats['WRONG_ANSWER'] || 0,
                    timeLimitExceeded: verdictStats['TIME_LIMIT_EXCEEDED'] || 0,
                    compilationError: verdictStats['COMPILATION_ERROR'] || 0,
                    languageStats,
                    verdictStats
                },
                recentSubmissions: submissions.slice(0, 10).map(sub => ({
                    id: sub.id,
                    contestId: sub.contestId,
                    problemName: sub.problem.name,
                    problemIndex: sub.problem.index,
                    verdict: sub.verdict,
                    programmingLanguage: sub.programmingLanguage,
                    creationTimeSeconds: sub.creationTimeSeconds,
                    timeConsumedMillis: sub.timeConsumedMillis,
                    memoryConsumedBytes: sub.memoryConsumedBytes
                })),
                ratingHistory: ratings.map(contest => ({
                    contestId: contest.contestId,
                    contestName: contest.contestName,
                    rank: contest.rank,
                    oldRating: contest.oldRating,
                    newRating: contest.newRating,
                    ratingUpdateTimeSeconds: contest.ratingUpdateTimeSeconds
                }))
            };

            setCodingProfiles(prev => ({
                ...prev,
                codeforces: { 
                    ...prev.codeforces, 
                    data: processedData, 
                    loading: false, 
                    error: null 
                }
            }));

        } catch (error) {
            console.error('Codeforces API Error:', error);
            setCodingProfiles(prev => ({
                ...prev,
                codeforces: { 
                    ...prev.codeforces, 
                    loading: false, 
                    error: error.message || 'Failed to fetch Codeforces data' 
                }
            }));
        }
    };

    // LeetCode API integration (using unofficial API)
    const fetchLeetCodeData = async (username) => {
        if (!username.trim()) return;
        
        setCodingProfiles(prev => ({
            ...prev,
            leetcode: { ...prev.leetcode, loading: true, error: null }
        }));

        try {
            // Using a CORS proxy for LeetCode GraphQL API
            const query = `
                query getUserProfile($username: String!) {
                    matchedUser(username: $username) {
                        username
                        profile {
                            ranking
                            userAvatar
                            realName
                            aboutMe
                            school
                            websites
                            countryName
                            company
                            jobTitle
                            skillTags
                            postViewCount
                            postViewCountDiff
                            reputation
                            reputationDiff
                        }
                        submitStats: submitStatsGlobal {
                            acSubmissionNum {
                                difficulty
                                count
                                submissions
                            }
                        }
                        badges {
                            id
                            displayName
                            icon
                            creationDate
                        }
                        upcomingBadges {
                            name
                            icon
                            progress
                        }
                        activeBadge {
                            id
                            displayName
                            icon
                        }
                    }
                    recentSubmissionList(username: $username, limit: 10) {
                        title
                        titleSlug
                        timestamp
                        statusDisplay
                        lang
                    }
                    userContestRanking(username: $username) {
                        attendedContestsCount
                        rating
                        globalRanking
                        totalParticipants
                        topPercentage
                    }
                }
            `;

            // Mock LeetCode data since the actual API requires authentication
            // In a real implementation, you'd need to use LeetCode's official API or a proxy service
            const mockLeetCodeData = {
                profile: {
                    username: username,
                    ranking: Math.floor(Math.random() * 100000) + 1000,
                    realName: 'LeetCode User',
                    aboutMe: 'Passionate problem solver',
                    countryName: 'Unknown',
                    company: '',
                    jobTitle: '',
                    reputation: Math.floor(Math.random() * 1000),
                    postViewCount: Math.floor(Math.random() * 5000),
                    userAvatar: `https://assets.leetcode.com/users/avatars/avatar_${Math.floor(Math.random() * 10) + 1}.png`
                },
                statistics: {
                    totalSolved: Math.floor(Math.random() * 500) + 100,
                    totalSubmissions: Math.floor(Math.random() * 1000) + 300,
                    acceptanceRate: (Math.random() * 40 + 40).toFixed(1),
                    easy: {
                        solved: Math.floor(Math.random() * 200) + 50,
                        total: 500,
                        submissions: Math.floor(Math.random() * 400) + 100
                    },
                    medium: {
                        solved: Math.floor(Math.random() * 150) + 30,
                        total: 1000,
                        submissions: Math.floor(Math.random() * 300) + 80
                    },
                    hard: {
                        solved: Math.floor(Math.random() * 50) + 10,
                        total: 300,
                        submissions: Math.floor(Math.random() * 100) + 20
                    }
                },
                contestRanking: {
                    attendedContestsCount: Math.floor(Math.random() * 50) + 5,
                    rating: Math.floor(Math.random() * 1000) + 1200,
                    globalRanking: Math.floor(Math.random() * 50000) + 1000,
                    topPercentage: (Math.random() * 50 + 10).toFixed(1)
                },
                recentSubmissions: Array.from({ length: 10 }, (_, i) => ({
                    title: `Problem ${i + 1}`,
                    titleSlug: `problem-${i + 1}`,
                    timestamp: Date.now() - (i * 24 * 60 * 60 * 1000),
                    statusDisplay: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded'][Math.floor(Math.random() * 3)],
                    lang: ['javascript', 'python', 'cpp', 'java'][Math.floor(Math.random() * 4)]
                })),
                badges: [
                    { id: 1, displayName: 'Problem Solver', icon: '🏆', creationDate: '2023-01-01' },
                    { id: 2, displayName: 'Daily Streak', icon: '🔥', creationDate: '2023-02-01' }
                ]
            };

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            setCodingProfiles(prev => ({
                ...prev,
                leetcode: { 
                    ...prev.leetcode, 
                    data: mockLeetCodeData, 
                    loading: false, 
                    error: null 
                }
            }));

        } catch (error) {
            console.error('LeetCode API Error:', error);
            setCodingProfiles(prev => ({
                ...prev,
                leetcode: { 
                    ...prev.leetcode, 
                    loading: false, 
                    error: error.message || 'Failed to fetch LeetCode data' 
                }
            }));
        }
    };

    const handleCodingProfileChange = (platform, username) => {
        setCodingProfiles(prev => ({
            ...prev,
            [platform]: { ...prev[platform], username }
        }));
        
        setFormData(prev => ({
            ...prev,
            codingProfiles: {
                ...prev.codingProfiles,
                [platform]: username
            }
        }));
    };

    const refreshCodingProfile = (platform) => {
        const username = codingProfiles[platform].username;
        if (platform === 'codeforces') {
            fetchCodeforcesData(username);
        } else if (platform === 'leetcode') {
            fetchLeetCodeData(username);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('social.')) {
            const socialPlatform = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                socialLinks: {
                    ...prev.socialLinks,
                    [socialPlatform]: value
                }
            }));
        } else if (name.startsWith('coding.')) {
            const codingPlatform = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                codingProfiles: {
                    ...prev.codingProfiles,
                    [codingPlatform]: value
                }
            }));
        } else {
            setFormData({
                ...formData,
                [name]: value
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const profileData = {
            ...formData,
            skills: formData.skills.split(',').map(skill => skill.trim()).filter(Boolean)
        };

        const result = await updateProfile(profileData);
        
        if (result.success) {
            toast.success('Profile updated successfully!');
            setIsEditing(false);
            
            // Update coding profiles state
            setCodingProfiles(prev => ({
                codeforces: { ...prev.codeforces, username: formData.codingProfiles.codeforces },
                leetcode: { ...prev.leetcode, username: formData.codingProfiles.leetcode }
            }));
        } else {
            toast.error(result.error);
        }
        
        setLoading(false);
    };

    const handleCancel = () => {
        setFormData({
            username: user?.username || '',
            email: user?.email || '',
            bio: user?.bio || '',
            location: user?.location || '',
            website: user?.website || '',
            company: user?.company || '',
            jobTitle: user?.jobTitle || '',
            skills: user?.skills?.join(', ') || '',
            socialLinks: {
                github: user?.socialLinks?.github || '',
                linkedin: user?.socialLinks?.linkedin || '',
                twitter: user?.socialLinks?.twitter || ''
            }
        });
        setIsEditing(false);
    };

    const mockStats = {
        codingSessions: 47,
        collaborations: 23,
        hoursTracked: 156,
        projectsCompleted: 12,
        linesOfCode: 25647,
        favoriteLanguage: 'JavaScript'
    };

    const mockActivity = [
        { type: 'session', message: 'Started a new coding session', time: '2 hours ago', icon: FiCode },
        { type: 'collaboration', message: 'Collaborated with team on React project', time: '1 day ago', icon: FiUsers },
        { type: 'achievement', message: 'Earned "Code Master" badge', time: '2 days ago', icon: FiAward },
        { type: 'profile', message: 'Updated profile information', time: '3 days ago', icon: FiUser }
    ];

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FiUser },
        { id: 'coding-profiles', label: 'Coding Profiles', icon: FiCode, badge: 'NEW' },
        { id: 'activity', label: 'Activity', icon: FiActivity },
        { id: 'achievements', label: 'Achievements', icon: FiAward },
        { id: 'settings', label: 'Settings', icon: FiSettings }
    ];

    const renderCodeforcesProfile = () => {
        const { data, loading, error } = codingProfiles.codeforces;
        
        if (loading) {
            return (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading Codeforces data...</p>
                </div>
            );
        }
        
        if (error) {
            return (
                <div className="text-center py-8">
                    <FiAlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                    <p className="mt-2 text-red-600">{error}</p>
                    <button
                        onClick={() => refreshCodingProfile('codeforces')}
                        className="mt-2 text-blue-600 hover:text-blue-800"
                    >
                        Try again
                    </button>
                </div>
            );
        }
        
        if (!data) {
            return (
                <div className="text-center py-8">
                    <FiCode className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="mt-2 text-gray-600">No Codeforces data available</p>
                </div>
            );
        }

        const getRankColor = (rank) => {
            const colors = {
                'newbie': 'text-gray-600',
                'pupil': 'text-green-600',
                'specialist': 'text-cyan-600',
                'expert': 'text-blue-600',
                'candidate master': 'text-purple-600',
                'master': 'text-orange-600',
                'international master': 'text-orange-600',
                'grandmaster': 'text-red-600',
                'international grandmaster': 'text-red-600',
                'legendary grandmaster': 'text-red-700'
            };
            return colors[rank?.toLowerCase()] || 'text-gray-600';
        };

        return (
            <div className="space-y-6">
                {/* Profile Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center space-x-4">
                        {data.profile.avatar && (
                            <img
                                src={data.profile.avatar}
                                alt={data.profile.handle}
                                className="w-16 h-16 rounded-full border-4 border-white"
                            />
                        )}
                        <div>
                            <h3 className="text-2xl font-bold">{data.profile.handle}</h3>
                            {(data.profile.firstName || data.profile.lastName) && (
                                <p className="text-blue-100">
                                    {data.profile.firstName} {data.profile.lastName}
                                </p>
                            )}
                            <p className={`font-semibold capitalize ${getRankColor(data.profile.rank)} bg-white bg-opacity-20 px-2 py-1 rounded text-sm inline-block mt-1`}>
                                {data.profile.rank} ({data.profile.rating})
                            </p>
                        </div>
                    </div>
                    
                    {data.profile.organization && (
                        <div className="mt-4 flex items-center space-x-2">
                            <FiMapPin size={16} />
                            <span>{data.profile.organization}</span>
                        </div>
                    )}
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-gray-900">{data.statistics.totalSubmissions}</div>
                        <div className="text-sm text-gray-600">Total Submissions</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-green-600">{data.statistics.solvedProblems}</div>
                        <div className="text-sm text-gray-600">Problems Solved</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600">{data.profile.maxRating}</div>
                        <div className="text-sm text-gray-600">Max Rating</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-purple-600">{data.ratingHistory.length}</div>
                        <div className="text-sm text-gray-600">Contests</div>
                    </div>
                </div>

                {/* Recent Submissions */}
                <div className="bg-white rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Submissions</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2">Problem</th>
                                    <th className="text-left py-2">Verdict</th>
                                    <th className="text-left py-2">Language</th>
                                    <th className="text-left py-2">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentSubmissions.slice(0, 5).map((submission, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="py-2">
                                            <a
                                                href={`https://codeforces.com/contest/${submission.contestId}/problem/${submission.problemIndex}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                                            >
                                                <span>{submission.problemName}</span>
                                                <FiExternalLink size={12} />
                                            </a>
                                        </td>
                                        <td className="py-2">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                submission.verdict === 'OK' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {submission.verdict}
                                            </span>
                                        </td>
                                        <td className="py-2 text-gray-600">{submission.programmingLanguage}</td>
                                        <td className="py-2 text-gray-600">
                                            {new Date(submission.creationTimeSeconds * 1000).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderLeetCodeProfile = () => {
        const { data, loading, error } = codingProfiles.leetcode;
        
        if (loading) {
            return (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading LeetCode data...</p>
                </div>
            );
        }
        
        if (error) {
            return (
                <div className="text-center py-8">
                    <FiAlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                    <p className="mt-2 text-red-600">{error}</p>
                    <button
                        onClick={() => refreshCodingProfile('leetcode')}
                        className="mt-2 text-orange-600 hover:text-orange-800"
                    >
                        Try again
                    </button>
                </div>
            );
        }
        
        if (!data) {
            return (
                <div className="text-center py-8">
                    <FiCode className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="mt-2 text-gray-600">No LeetCode data available</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Profile Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-6 text-white">
                    <div className="flex items-center space-x-4">
                        {data.profile.userAvatar && (
                            <img
                                src={data.profile.userAvatar}
                                alt={data.profile.username}
                                className="w-16 h-16 rounded-full border-4 border-white"
                            />
                        )}
                        <div>
                            <h3 className="text-2xl font-bold">{data.profile.username}</h3>
                            {data.profile.realName && (
                                <p className="text-orange-100">{data.profile.realName}</p>
                            )}
                            <p className="text-orange-100">
                                Rank: #{data.profile.ranking.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-gray-900">{data.statistics.totalSolved}</div>
                        <div className="text-sm text-gray-600">Problems Solved</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-orange-600">{data.statistics.acceptanceRate}%</div>
                        <div className="text-sm text-gray-600">Acceptance Rate</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600">{data.contestRanking?.rating || 'N/A'}</div>
                        <div className="text-sm text-gray-600">Contest Rating</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-purple-600">{data.contestRanking?.attendedContestsCount || 0}</div>
                        <div className="text-sm text-gray-600">Contests</div>
                    </div>
                </div>

                {/* Problem Difficulty Breakdown */}
                <div className="bg-white rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Problem Statistics</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                                <FiCheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="text-2xl font-bold text-green-600">{data.statistics.easy.solved}</div>
                            <div className="text-sm text-gray-600">Easy</div>
                            <div className="text-xs text-gray-500">
                                {data.statistics.easy.solved}/{data.statistics.easy.total}
                            </div>
                        </div>
                        
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-2 bg-yellow-100 rounded-full flex items-center justify-center">
                                <FiTarget className="h-8 w-8 text-yellow-600" />
                            </div>
                            <div className="text-2xl font-bold text-yellow-600">{data.statistics.medium.solved}</div>
                            <div className="text-sm text-gray-600">Medium</div>
                            <div className="text-xs text-gray-500">
                                {data.statistics.medium.solved}/{data.statistics.medium.total}
                            </div>
                        </div>
                        
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-2 bg-red-100 rounded-full flex items-center justify-center">
                                <FiZap className="h-8 w-8 text-red-600" />
                            </div>
                            <div className="text-2xl font-bold text-red-600">{data.statistics.hard.solved}</div>
                            <div className="text-sm text-gray-600">Hard</div>
                            <div className="text-xs text-gray-500">
                                {data.statistics.hard.solved}/{data.statistics.hard.total}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges */}
                {data.badges && data.badges.length > 0 && (
                    <div className="bg-white rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Badges</h4>
                        <div className="flex flex-wrap gap-3">
                            {data.badges.map((badge, index) => (
                                <div
                                    key={index}
                                    className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg"
                                >
                                    <span className="text-lg">{badge.icon}</span>
                                    <span className="text-sm font-medium">{badge.displayName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Submissions */}
                <div className="bg-white rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Submissions</h4>
                    <div className="space-y-3">
                        {data.recentSubmissions.slice(0, 5).map((submission, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <a
                                        href={`https://leetcode.com/problems/${submission.titleSlug}/`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                                    >
                                        <span>{submission.title}</span>
                                        <FiExternalLink size={12} />
                                    </a>
                                    <div className="text-sm text-gray-600 mt-1">
                                        {submission.lang} • {new Date(submission.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs ${
                                    submission.statusDisplay === 'Accepted' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {submission.statusDisplay}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-30">
                <img 
                    src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
                    alt="coding background" 
                    className="w-full h-full object-cover filter blur-3xl"
                />
            </div>
            
            {/* Geometric Patterns */}
            <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#6366f1" strokeWidth="1"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            {/* Header */}
            <div className="relative bg-white/90 backdrop-blur-lg shadow-lg border-b border-white/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-all duration-300 group"
                            >
                                <div className="p-2 rounded-full bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                                    <FiArrowLeft size={20} />
                                </div>
                                <span className="font-medium">Back to Home</span>
                            </button>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                <FiEdit2 size={16} />
                                <span className="font-medium">{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                            </button>
                            
                            <button
                                onClick={logout}
                                className="p-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                                title="Logout"
                            >
                                <FiShield size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Profile Header */}
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden mb-8 border border-white/20">
                    <div className="relative h-48 sm:h-64 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 overflow-hidden">
                        {/* Coding Animation Background */}
                        <div className="absolute inset-0 opacity-20">
                            <img 
                                src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80" 
                                alt="coding setup" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        
                        {/* Animated Elements */}
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute top-4 left-4 w-12 h-12 bg-white/20 rounded-lg rotate-12 animate-pulse"></div>
                            <div className="absolute top-8 right-8 w-8 h-8 bg-yellow-400/30 rounded-full animate-bounce"></div>
                            <div className="absolute bottom-8 left-8 w-6 h-6 bg-blue-400/30 rounded-full animate-ping"></div>
                            <div className="absolute bottom-4 right-12 w-10 h-10 bg-green-400/20 rounded-lg -rotate-12 animate-pulse"></div>
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                    
                    <div className="relative px-8 pb-8">
                        {/* Profile Picture and Basic Info */}
                        <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-8 -mt-20 sm:-mt-24">
                            <div className="relative mb-6 sm:mb-0">
                                <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-3xl flex items-center justify-center text-4xl sm:text-5xl font-bold text-white shadow-2xl border-4 border-white transform hover:scale-105 transition-transform duration-300">
                                    {user?.profilePicture ? (
                                        <img
                                            src={user.profilePicture}
                                            alt={user.username}
                                            className="w-full h-full rounded-3xl object-cover"
                                        />
                                    ) : (
                                        <div className="relative">
                                            {user?.username?.charAt(0).toUpperCase()}
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                                <button className="absolute -bottom-2 -right-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300">
                                    <FiCamera size={18} />
                                </button>
                            </div>
                            
                            <div className="flex-1 min-w-0 sm:pb-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent truncate">
                                            {user?.username}
                                        </h1>
                                        <p className="text-gray-600 flex items-center mt-2 text-lg">
                                            <div className="p-1 bg-indigo-100 rounded-lg mr-3">
                                                <FiMail size={16} className="text-indigo-600" />
                                            </div>
                                            {user?.email}
                                        </p>
                                        {user?.jobTitle && (
                                            <p className="text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text font-semibold mt-2 text-lg">
                                                {user.jobTitle} {user?.company && `at ${user.company}`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-gray-600">
                                    <div className="flex items-center bg-gray-50 px-4 py-2 rounded-xl">
                                        <FiCalendar size={16} className="mr-2 text-indigo-600" />
                                        Joined {new Date(user?.createdAt).toLocaleDateString()}
                                    </div>
                                    {user?.location && (
                                        <div className="flex items-center bg-gray-50 px-4 py-2 rounded-xl">
                                            <FiMapPin size={16} className="mr-2 text-red-500" />
                                            {user.location}
                                        </div>
                                    )}
                                    {user?.website && (
                                        <a
                                            href={user.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center bg-blue-50 px-4 py-2 rounded-xl text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-all duration-300"
                                        >
                                            <FiGlobe size={16} className="mr-2" />
                                            Website
                                        </a>
                                    )}
                                </div>

                                {/* Enhanced Quick Stats */}
                                <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-gray-100">
                                    <div className="text-center group cursor-pointer">
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-2xl group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300">
                                            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                                {mockStats.codingSessions}
                                            </div>
                                            <div className="text-sm text-gray-600 font-medium mt-1">Sessions</div>
                                        </div>
                                    </div>
                                    <div className="text-center group cursor-pointer">
                                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl group-hover:from-green-100 group-hover:to-green-200 transition-all duration-300">
                                            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                                                {mockStats.collaborations}
                                            </div>
                                            <div className="text-sm text-gray-600 font-medium mt-1">Collaborations</div>
                                        </div>
                                    </div>
                                    <div className="text-center group cursor-pointer">
                                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-2xl group-hover:from-purple-100 group-hover:to-purple-200 transition-all duration-300">
                                            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                                                {mockStats.hoursTracked}h
                                            </div>
                                            <div className="text-sm text-gray-600 font-medium mt-1">Coded</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Tab Navigation */}
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl mb-8 border border-white/20">
                    <div className="border-b border-gray-200/50">
                        <nav className="flex space-x-2 px-6 overflow-x-auto">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center space-x-3 py-4 px-6 border-b-3 font-semibold text-sm whitespace-nowrap transition-all duration-300 ${
                                        activeTab === tab.id
                                            ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50/50'
                                    }`}
                                >
                                    <div className={`p-2 rounded-xl ${
                                        activeTab === tab.id 
                                            ? 'bg-indigo-100 text-indigo-600' 
                                            : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        <tab.icon size={16} />
                                    </div>
                                    <span>{tab.label}</span>
                                    {tab.badge && (
                                        <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs px-3 py-1 rounded-full animate-pulse">
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        {activeTab === 'overview' && (
                            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                                </div>

                                {isEditing ? (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Basic Information */}
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Username
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="username"
                                                        value={formData.username}
                                                        onChange={handleChange}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Professional Information */}
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Information</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Job Title
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="jobTitle"
                                                        value={formData.jobTitle}
                                                        onChange={handleChange}
                                                        placeholder="Software Engineer"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Company
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="company"
                                                        value={formData.company}
                                                        onChange={handleChange}
                                                        placeholder="Tech Corp"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bio and Skills */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Bio
                                            </label>
                                            <textarea
                                                name="bio"
                                                rows={4}
                                                value={formData.bio}
                                                onChange={handleChange}
                                                placeholder="Tell us about yourself..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Skills (comma separated)
                                            </label>
                                            <input
                                                type="text"
                                                name="skills"
                                                value={formData.skills}
                                                onChange={handleChange}
                                                placeholder="JavaScript, React, Node.js, Python"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        {/* Location and Website */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Location
                                                </label>
                                                <input
                                                    type="text"
                                                    name="location"
                                                    value={formData.location}
                                                    onChange={handleChange}
                                                    placeholder="San Francisco, CA"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Website
                                                </label>
                                                <input
                                                    type="url"
                                                    name="website"
                                                    value={formData.website}
                                                    onChange={handleChange}
                                                    placeholder="https://your-website.com"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Social Links */}
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Social Links</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        GitHub
                                                    </label>
                                                    <input
                                                        type="url"
                                                        name="social.github"
                                                        value={formData.socialLinks.github}
                                                        onChange={handleChange}
                                                        placeholder="https://github.com/username"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        LinkedIn
                                                    </label>
                                                    <input
                                                        type="url"
                                                        name="social.linkedin"
                                                        value={formData.socialLinks.linkedin}
                                                        onChange={handleChange}
                                                        placeholder="https://linkedin.com/in/username"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Twitter
                                                    </label>
                                                    <input
                                                        type="url"
                                                        name="social.twitter"
                                                        value={formData.socialLinks.twitter}
                                                        onChange={handleChange}
                                                        placeholder="https://twitter.com/username"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                            <button
                                                type="button"
                                                onClick={handleCancel}
                                                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <FiX size={16} />
                                                <span>Cancel</span>
                                            </button>
                                            
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                            >
                                                <FiSave size={16} />
                                                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Bio Section */}
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-3">About</h3>
                                            <p className="text-gray-700 leading-relaxed">
                                                {user?.bio || 'No bio provided yet. Share something about yourself!'}
                                            </p>
                                        </div>

                                        {/* Skills Section */}
                                        {user?.skills?.length > 0 && (
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-3">Skills</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {user.skills.map((skill, index) => (
                                                        <span
                                                            key={index}
                                                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                                                        >
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Professional Info */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Job Title</h3>
                                                <p className="text-gray-900">
                                                    {user?.jobTitle || 'Not specified'}
                                                </p>
                                            </div>
                                            
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Company</h3>
                                                <p className="text-gray-900">
                                                    {user?.company || 'Not specified'}
                                                </p>
                                            </div>
                                            
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Location</h3>
                                                <p className="text-gray-900">
                                                    {user?.location || 'Not specified'}
                                                </p>
                                            </div>
                                            
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Website</h3>
                                                <p>
                                                    {user?.website ? (
                                                        <a
                                                            href={user.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 transition-colors"
                                                        >
                                                            {user.website}
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-900">Not specified</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Social Links */}
                                        {(user?.socialLinks?.github || user?.socialLinks?.linkedin || user?.socialLinks?.twitter) && (
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-3">Social Links</h3>
                                                <div className="flex space-x-4">
                                                    {user.socialLinks.github && (
                                                        <a
                                                            href={user.socialLinks.github}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                                                        >
                                                            <FiGithub size={20} />
                                                            <span>GitHub</span>
                                                        </a>
                                                    )}
                                                    {/* Add other social links similarly */}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'coding-profiles' && (
                            <div className="space-y-8">
                                {/* Enhanced Coding Profiles Management */}
                                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl">
                                                <FiCode className="h-8 w-8 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900">Coding Profiles</h2>
                                                <p className="text-gray-600">Connect your competitive programming accounts</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setEditingCodingProfiles(!editingCodingProfiles)}
                                            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg"
                                        >
                                            <FiEdit2 size={16} />
                                            <span className="font-medium">{editingCodingProfiles ? 'Done' : 'Edit'}</span>
                                        </button>
                                    </div>

                                    {editingCodingProfiles && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                                            <div className="space-y-3">
                                                <label className="block text-sm font-semibold text-gray-700">
                                                    🟦 Codeforces Username
                                                </label>
                                                <div className="flex space-x-3">
                                                    <input
                                                        type="text"
                                                        value={codingProfiles.codeforces.username}
                                                        onChange={(e) => handleCodingProfileChange('codeforces', e.target.value)}
                                                        placeholder="your_handle"
                                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchCodeforcesData(codingProfiles.codeforces.username)}
                                                        disabled={!codingProfiles.codeforces.username.trim() || codingProfiles.codeforces.loading}
                                                        className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all duration-300 shadow-lg"
                                                    >
                                                        <FiRefreshCw size={16} className={codingProfiles.codeforces.loading ? 'animate-spin' : ''} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <label className="block text-sm font-semibold text-gray-700">
                                                    🟧 LeetCode Username
                                                </label>
                                                <div className="flex space-x-3">
                                                    <input
                                                        type="text"
                                                        value={codingProfiles.leetcode.username}
                                                        onChange={(e) => handleCodingProfileChange('leetcode', e.target.value)}
                                                        placeholder="your_username"
                                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white shadow-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchLeetCodeData(codingProfiles.leetcode.username)}
                                                        disabled={!codingProfiles.leetcode.username.trim() || codingProfiles.leetcode.loading}
                                                        className="px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-all duration-300 shadow-lg"
                                                    >
                                                        <FiRefreshCw size={16} className={codingProfiles.leetcode.loading ? 'animate-spin' : ''} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Enhanced Codeforces Profile */}
                                    <div className="mb-10">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center space-x-4">
                                                <div className="relative">
                                                    <img 
                                                        src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
                                                        alt="Codeforces" 
                                                        className="w-12 h-12 rounded-xl object-cover shadow-lg"
                                                    />
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                                                        <span>Codeforces</span>
                                                    </h3>
                                                    <p className="text-gray-600 text-sm">Competitive Programming Platform</p>
                                                </div>
                                            </div>
                                            {codingProfiles.codeforces.username && (
                                                <button
                                                    onClick={() => refreshCodingProfile('codeforces')}
                                                    className="p-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all duration-300"
                                                    title="Refresh data"
                                                >
                                                    <FiRefreshCw size={18} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                                            {renderCodeforcesProfile()}
                                        </div>
                                    </div>

                                    {/* Enhanced LeetCode Profile */}
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center space-x-4">
                                                <div className="relative">
                                                    <img 
                                                        src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
                                                        alt="LeetCode" 
                                                        className="w-12 h-12 rounded-xl object-cover shadow-lg"
                                                    />
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                                                        <span>LeetCode</span>
                                                    </h3>
                                                    <p className="text-gray-600 text-sm">Algorithm & Data Structure Practice</p>
                                                </div>
                                            </div>
                                            {codingProfiles.leetcode.username && (
                                                <button
                                                    onClick={() => refreshCodingProfile('leetcode')}
                                                    className="p-3 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-xl transition-all duration-300"
                                                    title="Refresh data"
                                                >
                                                    <FiRefreshCw size={18} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-100">
                                            {renderLeetCodeProfile()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
                                
                                <div className="space-y-4">
                                    {mockActivity.map((activity, index) => (
                                        <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                                            <div className={`p-2 rounded-full ${
                                                activity.type === 'session' ? 'bg-blue-100 text-blue-600' :
                                                activity.type === 'collaboration' ? 'bg-green-100 text-green-600' :
                                                activity.type === 'achievement' ? 'bg-purple-100 text-purple-600' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                <activity.icon size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-gray-900">{activity.message}</p>
                                                <p className="text-sm text-gray-500 mt-1">{activity.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'achievements' && (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-6">Achievements</h2>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-yellow-100 rounded-full">
                                                <FiStar className="h-5 w-5 text-yellow-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900">Code Master</h3>
                                                <p className="text-sm text-gray-500">Completed 50+ coding sessions</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-green-100 rounded-full">
                                                <FiUsers className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900">Team Player</h3>
                                                <p className="text-sm text-gray-500">Collaborated on 20+ projects</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Settings</h2>
                                
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <FiBell className="h-5 w-5 text-gray-600" />
                                            <div>
                                                <h3 className="font-medium text-gray-900">Email Notifications</h3>
                                                <p className="text-sm text-gray-500">Receive updates about your activity</p>
                                            </div>
                                        </div>
                                        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                                            Enabled
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <FiEye className="h-5 w-5 text-gray-600" />
                                            <div>
                                                <h3 className="font-medium text-gray-900">Profile Visibility</h3>
                                                <p className="text-sm text-gray-500">Control who can see your profile</p>
                                            </div>
                                        </div>
                                        <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                                            Public
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Enhanced Sidebar */}
                    <div className="space-y-8">
                        {/* Enhanced Detailed Stats */}
                        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl">
                                    <FiBarChart2 className="h-6 w-6 text-purple-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Statistics</h2>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-blue-500 p-3 rounded-xl shadow-lg">
                                            <FiCode className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="font-medium text-gray-900">Lines of Code</span>
                                    </div>
                                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                        {mockStats.linesOfCode.toLocaleString()}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-green-500 p-3 rounded-xl shadow-lg">
                                            <FiTrendingUp className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="font-medium text-gray-900">Projects</span>
                                    </div>
                                    <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                                        {mockStats.projectsCompleted}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-purple-500 p-3 rounded-xl shadow-lg">
                                            <FiStar className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="font-medium text-gray-900">Favorite Language</span>
                                    </div>
                                    <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                                        {mockStats.favoriteLanguage}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Quick Actions */}
                        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl">
                                    <FiZap className="h-6 w-6 text-indigo-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <FiCode size={18} />
                                    </div>
                                    <span className="font-semibold">Start Coding</span>
                                </button>
                                
                                <button className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-6 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <FiUsers size={18} />
                                    </div>
                                    <span className="font-semibold">Find Collaborators</span>
                                </button>
                                
                                <button className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 px-6 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <FiAward size={18} />
                                    </div>
                                    <span className="font-semibold">View Achievements</span>
                                </button>
                            </div>
                        </div>

                        {/* Coding Journey Card */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
                            
                            <div className="relative">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-3 bg-white/20 rounded-2xl">
                                        <FiGift className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-bold">Coding Journey</h3>
                                </div>
                                
                                <p className="text-white/90 mb-4">
                                    "The journey of a thousand miles begins with a single step. Keep coding, keep growing!"
                                </p>
                                
                                <div className="flex items-center space-x-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">365</div>
                                        <div className="text-sm text-white/80">Days</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">12</div>
                                        <div className="text-sm text-white/80">Languages</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">∞</div>
                                        <div className="text-sm text-white/80">Possibilities</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
