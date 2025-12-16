"use client"
import React, { useState, useEffect } from 'react';
import { Download, AlertTriangle, CheckCircle, XCircle, TrendingUp, Users, Heart, MessageCircle } from 'lucide-react';
import jsPDF from 'jspdf';

type Post = {
  id: number;
  caption: string | any; // use proper type here
  text?: string;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number | string;
  posted_ago: string;
  type: string;
  likesCount?: number;
  [key: string]: any;
};

type BrandFitScore = {
  overallScore: number;
  causeAlignment: number;
  brandSafety: number;
  audienceAuthenticity: number;
  recommendation: string;
  insights: {
    causeContent: number;
    riskFactors: number;
    engagedPosts: number;
    aiAnalysis?: string; 
  };
};

const GoFundMeInfluencerCalculator = () => {
  // Optional: add your OpenAI key here if you have one (client-side use is not recommended)
  const OPENAI_KEY = '';
  
  // Creator analysis state
  const [creatorUrl, setCreatorUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ [key: string]: any } | null>(null);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [brandFitScore, setBrandFitScore] = useState<BrandFitScore | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Basic calculation state
  const [followerCount, setFollowerCount] = useState(0);
  const [engagementRate, setEngagementRate] = useState(0);
  const [contentType, setContentType] = useState('instagram-video');
  const [numDeliverables, setNumDeliverables] = useState(1);
  const [exclusivity, setExclusivity] = useState('none');
  const [usageRights, setUsageRights] = useState({
    brandRepost: false,
    paidAds: false,
    website: false
  });
  
  // Results state
  const [baseRate, setBaseRate] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [emv, setEmv] = useState(0);

  // Extract handle from URL
  const extractHandleFromUrl = (url: string) => {
    const patterns = [
      /instagram\.com\/([^\/\?]+)/,
      /tiktok\.com\/@([^\/\?]+)/,
      /youtube\.com\/c\/([^\/\?]+)/,
      /youtube\.com\/channel\/([^\/\?]+)/,
      /youtube\.com\/@([^\/\?]+)/,
      /linkedin\.com\/in\/([^\/\?]+)/,
      /twitter\.com\/([^\/\?]+)/,
      /x\.com\/([^\/\?]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return url.replace('@', '');
  };

  // Detect platform from URL
  const detectPlatform = (url: string) => {
    if (url.includes('instagram.com')) return 'instagram-video';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    return 'instagram-video';
  };

  // Real Apify API call
  const callApifyInstagramScraper = async (instagramUrl: string) => {
    try {
      console.log('🚀 Starting Instagram scraper (server-side)…');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch('/api/instagram-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramUrl }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Scraper API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data?.results ?? [];
    } catch (error) {
      console.error('💥 Instagram scrape error:', error);
      throw error;
    }
  };

  // OpenAI brand fit analysis
  const analyzeContentWithOpenAI = async (posts: Post[], handle: string) => {
    if (!OPENAI_KEY) {
      // Fallback to simulated analysis
      return generateBrandFitAnalysis(handle, posts);
    }

    try {
      const postTexts = posts.map(p => p.caption || p.text || '').join('\n\n');
      
      const prompt = `Analyze this Instagram creator's content for GoFundMe brand partnership potential:

Creator: @${handle}
Recent posts:
${postTexts}

Score each category 0-100:
1. Cause Alignment: How often do they mention charitable causes, fundraising, helping others?
2. Brand Safety: Absence of controversial, political, or inappropriate content
3. Audience Authenticity: Quality engagement vs follower count

Return JSON format:
{
  "causeAlignment": 85,
  "brandSafety": 92,
  "audienceAuthenticity": 78,
  "insights": "Brief analysis of why these scores were given"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error('OpenAI API error');
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);
      
      const overallScore = (analysis.causeAlignment * 0.4 + analysis.brandSafety * 0.3 + analysis.audienceAuthenticity * 0.3);
      
      let recommendation = 'amber';
      if (overallScore >= 75) recommendation = 'green';
      else if (overallScore < 50) recommendation = 'red';

      return {
        overallScore: Math.round(overallScore),
        causeAlignment: analysis.causeAlignment,
        brandSafety: analysis.brandSafety,
        audienceAuthenticity: analysis.audienceAuthenticity,
        recommendation,
        insights: {
          aiAnalysis: analysis.insights,
          causeContent: 0,
          riskFactors: 0,
          engagedPosts: 0
        }
      };
    } catch (error) {
      console.error('OpenAI analysis failed, using fallback:', error);
      return generateBrandFitAnalysis(handle, posts);
    }
  };

  // Fallback brand fit analysis
  const generateBrandFitAnalysis = (handle: string, posts: Post[]) => {
    const causeKeywords = ['charity', 'donate', 'fundraising', 'nonprofit', 'cause', 'help', 'support', 'community', 'giving', 'volunteer', 'social impact', 'philanthropy'];
    const riskKeywords = ['controversy', 'scandal', 'political', 'offensive', 'inappropriate'];
    
    let causeScore = 0;
    let riskScore = 0;
    let authenticityScore = 0;
    
    posts.forEach(post => {
      const content = (post.caption || post.text || '').toLowerCase();
      causeKeywords.forEach(keyword => {
        if (content.includes(keyword)) causeScore += 1;
      });
      riskKeywords.forEach(keyword => {
        if (content.includes(keyword)) riskScore += 1;
      });
      if ((post.likesCount || 0) > 1000) authenticityScore += 1;
    });

    const causeAlignment = Math.min(100, (causeScore / Math.max(posts.length, 1)) * 100 + 20);
    const brandSafety = Math.max(0, 100 - (riskScore / Math.max(posts.length, 1)) * 50);
    const audienceAuthenticity = Math.min(100, (authenticityScore / Math.max(posts.length, 1)) * 100 + 30);
    
    const overallScore = (causeAlignment * 0.4 + brandSafety * 0.3 + audienceAuthenticity * 0.3);
    
    let recommendation = 'amber';
    if (overallScore >= 75) recommendation = 'green';
    else if (overallScore < 50) recommendation = 'red';

    return {
      overallScore: Math.round(overallScore),
      causeAlignment: Math.round(causeAlignment),
      brandSafety: Math.round(brandSafety),
      audienceAuthenticity: Math.round(audienceAuthenticity),
      recommendation,
      insights: {
        causeContent: causeScore,
        riskFactors: riskScore,
        engagedPosts: authenticityScore
      }
    };
  };

  // Main analyze creator function with real API integration
  const analyzeCreator = async (url: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const handle = extractHandleFromUrl(url);
      const platform = detectPlatform(url);
      setContentType(platform);
      
      let analysisData: { [key: string]: any };
      let posts: Post[];
      
      if (platform === 'instagram-video') {
        try {
          // Use real Apify API for Instagram
          console.log('🎯 Attempting to scrape Instagram profile:', url);
          const scrapedData = await callApifyInstagramScraper(url);
          
          if (scrapedData && scrapedData.length > 0) {
            console.log('📊 Processing scraped data...', scrapedData);
            
            // Find profile data and posts in the response
            let profileData: any = null;
            let postsData: Post[] = [];

            
            // Look through all items to find profile and post data
            scrapedData.forEach((item: Post, index: number) => {
              console.log(`Item ${index}:`, item);
              console.log(`Item ${index} keys:`, Object.keys(item));
              
              // Check for profile data (various possible formats)
              if (item.followersCount !== undefined || item.followers !== undefined || 
                  item.type === 'userProfile' || item.biography !== undefined ||
                  item.username !== undefined) {
                profileData = item;
                console.log('✅ Found profile data:', profileData);
                
                // Extract posts from profile data if available
                if (item.latestPosts && Array.isArray(item.latestPosts)) {
                  console.log('📝 Found latestPosts array:', item.latestPosts.length, 'posts');
                  postsData.push(...item.latestPosts);
                }
                
                if (item.latestIgtvVideos && Array.isArray(item.latestIgtvVideos)) {
                  console.log('📹 Found latestIgtvVideos array:', item.latestIgtvVideos.length, 'videos');
                  postsData.push(...item.latestIgtvVideos);
                }
              }
              
              // Check for post data - more comprehensive detection (for direct post items)
              if (item.likesCount !== undefined || item.likes !== undefined || 
                  item.type === 'post' || item.caption !== undefined ||
                  item.commentsCount !== undefined || item.comments !== undefined ||
                  item.timestamp !== undefined || item.publishedAt !== undefined) {
                postsData.push(item);
                console.log('📝 Found direct post data:', item);
              }
            });
            
            console.log('📊 API Response Summary:', {
              totalItems: scrapedData.length,
              profileFound: !!profileData,
              postsFound: postsData.length,
              profileKeys: profileData ? Object.keys(profileData) : [],
              postKeys: postsData.length > 0 ? Object.keys(postsData[0]) : [],
              latestPostsCount: profileData?.latestPosts?.length || 0,
              latestIgtvCount: profileData?.latestIgtvVideos?.length || 0
            });
            
            // If no clear profile found, use first item and extract what we can
            if (!profileData && scrapedData[0]) {
              profileData = scrapedData[0];
              console.log('📝 Using first item as profile data:', profileData);
            }
            
            if (profileData) {
              // Extract follower count with multiple fallbacks
              const followers = profileData.followersCount || 
                              profileData.followers || 
                              profileData.subscribersCount || 
                              profileData.followerCount || 0;
              
              analysisData = {
                handle,
                platform,
                followers: followers,
                engagementRate: 0, // Will calculate from posts
                lastUpdated: new Date().toLocaleDateString(),
                bio: profileData.biography || 
                     profileData.bio || 
                     profileData.description || 
                     'No bio available',
                verified: profileData.verified || 
                         profileData.isVerified || false
              };
              
              console.log('👤 Profile processed:', analysisData);
              
              // Check if we have any posts from API
              if (postsData.length > 0) {
                console.log('🎉 Found', postsData.length, 'posts from API!');
                
                // Process posts data - take up to 10 most recent
                posts = postsData.slice(0, 10).map((post, i) => {
                  // Debug logging to see what data we're getting
                  console.log(`Processing post ${i + 1}:`, {
                    likesCount: post.likesCount,
                    likes: post.likes,
                    commentsCount: post.commentsCount,
                    comments: post.comments,
                    caption: post.caption,
                    type: post.type,
                    timestamp: post.timestamp
                  });
                  
                  // More robust likes processing
                  const processLikes = (post: any): number => {
                    const likesCount = post.likesCount;
                    const likes = post.likes;
                    
                    // Try likesCount first (common in API responses)
                    if (likesCount !== undefined && likesCount !== null && !isNaN(Number(likesCount))) {
                      return Number(likesCount);
                    }
                    
                    // Try likes field
                    if (likes !== undefined && likes !== null && !isNaN(Number(likes))) {
                      return Number(likes);
                    }
                    
                    // Try other possible field names
                    const possibleFields = ['likeCount', 'likes_count', 'like_count', 'totalLikes'];
                    for (const field of possibleFields) {
                      const value = post[field];
                      if (value !== undefined && value !== null && !isNaN(Number(value))) {
                        return Number(value);
                      }
                    }
                    
                    console.warn(`No valid likes found for post ${i + 1}, using 0`);
                    return 0;
                  };
                  
                  // More robust comments processing
                  const processComments = (post: any): number => {
                    const commentsCount = post.commentsCount;
                    const comments = post.comments;
                    
                    if (commentsCount !== undefined && commentsCount !== null && !isNaN(Number(commentsCount))) {
                      return Number(commentsCount);
                    }
                    
                    if (comments !== undefined && comments !== null && !isNaN(Number(comments))) {
                      return Number(comments);
                    }
                    
                    const possibleFields = ['commentCount', 'comments_count', 'comment_count', 'totalComments'];
                    for (const field of possibleFields) {
                      const value = post[field];
                      if (value !== undefined && value !== null && !isNaN(Number(value))) {
                        return Number(value);
                      }
                    }
                    
                    console.warn(`No valid comments found for post ${i + 1}, using 0`);
                    return 0;
                  };
                  
                  const processedPost = {
                    id: i + 1,
                    caption: post.caption || post.text || post.description || 'No caption',
                    likes: processLikes(post),
                    comments: processComments(post),
                    shares: post.sharesCount || post.shares || 0,
                    engagement_rate: 0, // Will calculate
                    posted_ago: post.timestamp ? 
                      new Date(post.timestamp).toLocaleDateString() : 
                      post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 
                      `${i + 1} days ago`,
                    type: post.type || (post.isVideo ? 'video' : 'photo')
                  };
                  
                  console.log(`Processed post ${i + 1}:`, processedPost);
                  return processedPost;
                });
                
                console.log('📝 All posts processed from API:', posts);
              } else {
                // No posts found in API response - generate simulated posts based on profile data
                console.log('⚠️ No posts found in API response, generating simulated posts...');
                
                // Add note about simulated posts
                setAnalysisError(`Profile data retrieved successfully, but no recent posts found. Using simulated post data based on follower count for demonstration.`);
                
                const hashCode = handle.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                
                const seed = Math.abs(hashCode) / 2147483647;
                
                posts = Array.from({length: 10}, (_, i) => {
                  const postSeed = seed + (i * 0.1);
                  const likes = Math.floor(followers * (postSeed * 0.05 + 0.01));
                  const comments = Math.floor(likes * (postSeed * 0.1 + 0.02));
                  
                  const post = {
                    id: i + 1,
                    caption: `Recent post ${i + 1} from @${handle} - simulated based on profile data`,
                    likes,
                    comments,
                    shares: Math.floor(likes * 0.05),
                    engagement_rate: ((likes + comments) / followers * 100).toFixed(2),
                    posted_ago: `${Math.floor(postSeed * 7) + 1} days ago`,
                    type: ['photo', 'video', 'carousel'][Math.floor(postSeed * 3)]
                  };
                  
                  console.log(`Simulated post ${i + 1}:`, post);
                  return post;
                });
                
                console.log('📝 All simulated posts generated for API profile:', posts);
              }
              
              // Log summary of likes and comments
              const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
              const totalComments = posts.reduce((sum, post) => sum + post.comments, 0);
              console.log('📊 Summary - Total likes:', totalLikes, 'Total comments:', totalComments, 'Average likes:', Math.round(totalLikes / posts.length));
              
              // Calculate engagement rates
              if (posts.length > 0 && analysisData.followers > 0) {
                posts.forEach(post => {
                  const engagements = post.likes + post.comments + post.shares;
                  post.engagement_rate = parseFloat(((engagements / analysisData.followers) * 100).toFixed(2));
                });
                
                const totalEngagements = posts.reduce((sum, post) => 
                  sum + post.likes + post.comments + post.shares, 0);
                const avgEngagementRate = (totalEngagements / posts.length) / analysisData.followers * 100;
                analysisData.engagementRate = avgEngagementRate.toFixed(2);
                
                console.log('📊 Engagement calculated:', analysisData.engagementRate + '%');
              }
            } else {
              throw new Error('❌ No valid profile data found in scraper results');
            }
          } else {
            throw new Error('❌ No data returned from Instagram scraper');
          }
        } catch (apiError) {
          console.error('💥 API scraping failed, using simulated data:', apiError);
          if (apiError instanceof Error) {
            setAnalysisError(`Live API failed: ${apiError.message}. Using simulated data for demonstration.`);
          } else {
            setAnalysisError('Live API failed: Unknown error. Using simulated data for demonstration.');
          }
          
          // Fallback to simulated data
          const hashCode = handle.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          
          const seed = Math.abs(hashCode) / 2147483647;
          const followers = Math.floor(seed * 2000000) + 50000;
          
          analysisData = {
            handle,
            platform,
            followers,
            engagementRate: (seed * 5 + 1).toFixed(2),
            lastUpdated: new Date().toLocaleDateString(),
            bio: `Demo profile for @${handle} - Live API temporarily unavailable`,
            verified: seed > 0.7
          };
          
          posts = Array.from({length: 10}, (_, i) => {
            const postSeed = seed + (i * 0.1);
            const likes = Math.floor(followers * (postSeed * 0.05 + 0.01));
            const comments = Math.floor(likes * (postSeed * 0.1 + 0.02));
            
            const post = {
              id: i + 1,
              caption: `Demo post ${i + 1} content - using simulated data`,
              likes,
              comments,
              shares: 0,
              engagement_rate: ((likes + comments) / followers * 100).toFixed(2),
              posted_ago: `${Math.floor(postSeed * 7) + 1} days ago`,
              type: ['photo', 'video', 'carousel'][Math.floor(postSeed * 3)]
            };
            
            console.log(`Simulated post ${i + 1}:`, post);
            return post;
          });
          
          console.log('📝 All simulated posts generated:', posts);
        }
      } else {
        // For non-Instagram platforms or when APIs not connected, use simulated data
        const hashCode = handle.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        
        const seed = Math.abs(hashCode) / 2147483647;
        const followers = Math.floor(seed * 2000000) + 50000;
        
        analysisData = {
          handle,
          platform,
          followers,
          engagementRate: (seed * 5 + 1).toFixed(2),
          lastUpdated: new Date().toLocaleDateString(),
          bio: `Content creator focused on ${platform.replace('-', ' ')}`,
          verified: seed > 0.7
        };
        
        posts = Array.from({length: 10}, (_, i) => {
          const postSeed = seed + (i * 0.1);
          const likes = Math.floor(followers * (postSeed * 0.05 + 0.01));
          const comments = Math.floor(likes * (postSeed * 0.1 + 0.02));
          
          const post = {
            id: i + 1,
            caption: `Sample ${platform} content ${i + 1}`,
            likes,
            comments,
            shares: 0,
            engagement_rate: ((likes + comments) / followers * 100).toFixed(2),
            posted_ago: `${Math.floor(postSeed * 7) + 1} days ago`,
            type: 'post'
          };
          
          console.log(`Non-Instagram simulated post ${i + 1}:`, post);
          return post;
        });
        
        console.log('📝 All non-Instagram simulated posts generated:', posts);
      }
      
      // Generate brand fit analysis (using OpenAI if available)
      const brandFit = await analyzeContentWithOpenAI(posts, handle);
      
      setAnalysisResult(analysisData);
      setRecentPosts(posts);
      setBrandFitScore(brandFit);
      setFollowerCount(analysisData.followers);
      setEngagementRate(parseFloat(analysisData.engagementRate));
      
    } catch (error) {
      console.error("Error analyzing creator:", error);
        if (error instanceof Error) {
          setAnalysisError(`Analysis failed: ${error.message}`);
        } else {
        setAnalysisError(`Analysis failed: Unknown error`);
        }
    } finally {
      setIsAnalyzing(false);
    }
  };

  type ExclusivityKey = 'none' | '30-day' | '90-day' | '180-day' | '365-day';

  // Exclusivity premiums
const exclusivityRates: Record<ExclusivityKey, number> = {
  'none': 0,
  '30-day': 0.1,
  '90-day': 0.2,
  '180-day': 0.3,
  '365-day': 0.5
};

  // Calculate pricing
  useEffect(() => {
    if (followerCount && engagementRate) {
      const calculatedBaseRate = Math.round(followerCount * (engagementRate / 100));
      setBaseRate(calculatedBaseRate);
      
      let calculatedPrice = calculatedBaseRate;
      
      if (usageRights.brandRepost) calculatedPrice += calculatedBaseRate * 0.1;
      if (usageRights.paidAds) calculatedPrice += calculatedBaseRate * 0.2;
      if (usageRights.website) calculatedPrice += calculatedBaseRate * 0.1;
      
      if (exclusivity in exclusivityRates) {
        calculatedPrice += calculatedBaseRate * exclusivityRates[exclusivity as ExclusivityKey];
      } else {
        calculatedPrice += 0; // fallback if needed
      }
      
      if (numDeliverables > 1) {
        const additionalCost = calculatedPrice * (numDeliverables - 1) * 0.9;
        calculatedPrice += additionalCost;
      }
      
      let rounded = calculatedPrice;
      if (calculatedPrice < 500) {
        rounded = Math.ceil(calculatedPrice / 25) * 25;
      } else if (calculatedPrice < 2000) {
        rounded = Math.ceil(calculatedPrice / 50) * 50;
      } else {
        rounded = Math.ceil(calculatedPrice / 100) * 100;
      }
      
      setFinalPrice(rounded);
      
      const nonprofitCPM = 5;
      const reachRate = contentType === 'youtube' ? 0.3 : 
                       contentType === 'tiktok' ? 0.4 : 0.2;
      const estimatedReach = followerCount * reachRate * (1 + engagementRate / 5);
      
      setEmv(estimatedReach * (nonprofitCPM / 1000));
    }
  }, [followerCount, engagementRate, contentType, numDeliverables, exclusivity, usageRights]);

  // Generate PDF report function
  const generateReport = () => {
    if (!analysisResult || !brandFitScore) return;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 6;
    let currentY = margin;

    // Helper function to add text with automatic page breaks
    const addText = (text: string, x: number, y: number, options: { fontSize?: number; fontStyle?: string; maxWidth?: number } = {}) => {
      const { fontSize = 10, fontStyle = 'normal', maxWidth = pageWidth - 2 * margin } = options;
      
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', fontStyle);
      
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      
      return y + (lines.length * lineHeight);
    };

    // Helper function to add a section header
    const addSectionHeader = (title: string, y: number) => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        y = margin;
      }
      
      pdf.setFillColor(34, 197, 94); // Green background
      pdf.rect(margin, y - 5, pageWidth - 2 * margin, 12, 'F');
      
      pdf.setTextColor(255, 255, 255); // White text
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margin + 3, y + 3);
      
      pdf.setTextColor(0, 0, 0); // Reset to black
      return y + 18;
    };

    // Add header with logo placeholder and title
    pdf.setFillColor(22, 163, 74); // Dark green
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GoFundMe Creator Evaluation Report', margin, 15);
    
    pdf.setTextColor(0, 0, 0);
    currentY = 35;

    // Creator Profile Section
    currentY = addSectionHeader('CREATOR PROFILE', currentY);
    
    currentY = addText(`Creator Handle: @${analysisResult.handle}`, margin, currentY, { fontSize: 12, fontStyle: 'bold' });
    currentY = addText(`Platform: ${analysisResult.platform.replace('-', ' ').toUpperCase()}`, margin, currentY + 2);
    currentY = addText(`Followers: ${analysisResult.followers.toLocaleString()}`, margin, currentY + 2);
    currentY = addText(`Engagement Rate: ${analysisResult.engagementRate}%`, margin, currentY + 2);
    currentY = addText(`Verified: ${analysisResult.verified ? 'Yes' : 'No'}`, margin, currentY + 2);
    currentY = addText(`Last Updated: ${analysisResult.lastUpdated}`, margin, currentY + 2);
    
    currentY = addText('Bio:', margin, currentY + 4, { fontStyle: 'bold' });
    currentY = addText(analysisResult.bio, margin, currentY + 2, { maxWidth: pageWidth - 2 * margin });

    currentY += 8;

    // Brand Fit Analysis Section
    currentY = addSectionHeader('GOFUNDME BRAND FIT ANALYSIS', currentY);
    
    // Overall Score with visual indicator
    const scoreColor: [number, number, number] = brandFitScore.overallScore >= 75 ? [34, 197, 94] : 
                      brandFitScore.overallScore >= 50 ? [251, 191, 36] : [239, 68, 68];
    
    pdf.setFillColor(...scoreColor);
    pdf.rect(margin, currentY, 50, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${brandFitScore.overallScore}/100`, margin + 15, currentY + 7);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Overall Brand Fit Score', margin + 55, currentY + 7);
    
    currentY += 18;

    // Individual Scores
    const scores = [
      { name: 'Cause Alignment', score: brandFitScore.causeAlignment, color: [34, 197, 94] },
      { name: 'Brand Safety', score: brandFitScore.brandSafety, color: [59, 130, 246] },
      { name: 'Audience Authenticity', score: brandFitScore.audienceAuthenticity, color: [147, 51, 234] }
    ];

    scores.forEach((item, index) => {
      const barWidth = (item.score / 100) * 100;
      
      currentY = addText(`${item.name}: ${item.score}/100`, margin, currentY);
      
      // Progress bar background
      pdf.setFillColor(229, 231, 235);
      pdf.rect(margin, currentY, 100, 4, 'F');
      
      // Progress bar fill
      pdf.setFillColor(...(item.color as [number, number, number]));
      pdf.rect(margin, currentY, barWidth, 4, 'F');
      
      currentY += 10;
    });

    // Recommendation
    const recommendationText = 
      brandFitScore.recommendation === 'green' ? 'EXCELLENT FIT - Highly recommended for GoFundMe campaigns' :
      brandFitScore.recommendation === 'amber' ? 'GOOD FIT - Recommended with proper guidelines' :
      'POOR FIT - Consider alternative creators';

    currentY = addText('Recommendation:', margin, currentY + 4, { fontStyle: 'bold' });
    currentY = addText(recommendationText, margin, currentY + 2, { 
      fontSize: 11, 
      fontStyle: brandFitScore.recommendation === 'green' ? 'bold' : 'normal' 
    });

    currentY += 8;

    // Content Analysis Insights
    if (brandFitScore.insights.aiAnalysis) {
      currentY = addText('AI Analysis:', margin, currentY, { fontStyle: 'bold' });
      currentY = addText(brandFitScore.insights.aiAnalysis, margin, currentY + 2, { maxWidth: pageWidth - 2 * margin });
    } else {
      currentY = addText('Content Analysis Insights:', margin, currentY, { fontStyle: 'bold' });
      currentY = addText(`• ${brandFitScore.insights.causeContent} posts mention charitable causes`, margin, currentY + 2);
      currentY = addText(`• ${brandFitScore.insights.riskFactors} potential brand safety concerns`, margin, currentY + 2);
      currentY = addText(`• ${brandFitScore.insights.engagedPosts} posts with high engagement`, margin, currentY + 2);
    }

    currentY += 8;

    // Pricing Analysis Section
    currentY = addSectionHeader('PRICING ANALYSIS', currentY);
    
    // Pricing breakdown
    const pricingData = [
      { label: 'Base Rate', value: `${baseRate.toLocaleString()}`, description: `(${followerCount.toLocaleString()} followers × ${engagementRate}% engagement)` },
      { label: 'Final Price', value: `${finalPrice.toLocaleString()}`, description: 'Including all add-ons and exclusivity' },
      { label: 'Estimated Media Value (EMV)', value: `${Math.round(emv).toLocaleString()}`, description: `ROI: ${Math.round((emv / finalPrice) * 100)}%` }
    ];

    pricingData.forEach(item => {
      currentY = addText(`${item.label}: ${item.value}`, margin, currentY, { fontSize: 12, fontStyle: 'bold' });
      currentY = addText(item.description, margin + 5, currentY + 2, { fontSize: 9 });
      currentY += 6;
    });

    // Campaign Details
    currentY = addText('Campaign Configuration:', margin, currentY + 4, { fontStyle: 'bold' });
    currentY = addText(`• ${numDeliverables} deliverable(s)`, margin, currentY + 2);
    currentY = addText(`• Content type: ${contentType.replace('-', ' ')}`, margin, currentY + 2);
    
    if (exclusivity !== 'none') {
      currentY = addText(`• Exclusivity: ${exclusivity.replace('-', ' ')} (+${exclusivityRates[exclusivity as ExclusivityKey] * 100}%)`, margin,
  currentY + 2
);

    }
    
    const usageRightsList = [];
    if (usageRights.brandRepost) usageRightsList.push('Brand repost (+10%)');
    if (usageRights.paidAds) usageRightsList.push('Paid ads (+20%)');
    if (usageRights.website) usageRightsList.push('Website usage (+10%)');
    
    if (usageRightsList.length > 0) {
      currentY = addText(`• Usage rights: ${usageRightsList.join(', ')}`, margin, currentY + 2);
    }

    currentY += 8;

    // Recent Posts Analysis
    currentY = addSectionHeader('RECENT POSTS ANALYSIS', currentY);
    console.log("recentPosts.length", recentPosts.length)
    if (recentPosts.length > 0) {
      // Debug: Log all posts and their likes values
      console.log("All posts for average calculation:", recentPosts.map(post => ({
        id: post.id,
        likes: post.likes,
        comments: post.comments,
        engagement_rate: post.engagement_rate
      })));
      
      const totalLikes = recentPosts.reduce((sum, post) => sum + post.likes, 0);
      const totalComments = recentPosts.reduce((sum, post) => sum + post.comments, 0);
      
      console.log("Total likes:", totalLikes, "Total comments:", totalComments);
      
      const avgLikes = Math.round(totalLikes / recentPosts.length);
      const avgComments = Math.round(totalComments / recentPosts.length);
      const avgEngagement = (
  recentPosts.reduce(
    (sum, post) => sum + parseFloat(String(post.engagement_rate)),
    0
  ) / recentPosts.length
).toFixed(2);
      
      console.log("Calculated averages - Likes:", avgLikes, "Comments:", avgComments, "Engagement:", avgEngagement);
      
      currentY = addText(`Posts analyzed: ${recentPosts.length}`, margin, currentY);
      currentY = addText(`Average likes: ${avgLikes.toLocaleString()}`, margin, currentY + 2);
      currentY = addText(`Average comments: ${avgComments.toLocaleString()}`, margin, currentY + 2);
      currentY = addText(`Average engagement rate: ${avgEngagement}%`, margin, currentY + 2);
      
      currentY += 6;
      
      // Show top 3 performing posts
      const topPosts = [...recentPosts]
        .sort((a, b) => parseFloat(String(b.engagement_rate)) - parseFloat(String(a.engagement_rate)))
        // .sort((a, b) => Number(b.engagement_rate) - Number(a.engagement_rate))
        .slice(0, 3);
      
      currentY = addText('Top Performing Posts:', margin, currentY, { fontStyle: 'bold' });
      
      topPosts.forEach((post, index) => {
        currentY = addText(`${index + 1}. Engagement: ${post.engagement_rate}%`, margin, currentY + 2, { fontSize: 9 });
        const caption = post.caption.length > 80 ? post.caption.substring(0, 80) + '...' : post.caption;
        currentY = addText(`   "${caption}"`, margin + 5, currentY + 2, { fontSize: 8, maxWidth: pageWidth - 2 * margin - 10 });
        currentY = addText(`   ${post.likes.toLocaleString()} likes, ${post.comments.toLocaleString()} comments`, margin + 5, currentY + 2, { fontSize: 8 });
        currentY += 4;
      });
    }

    // Footer
    const footerY = pageHeight - 15;
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Generated on ${new Date().toLocaleDateString()} | GoFundMe Creator Calculator`, margin, footerY);
    pdf.text(`Report for @${analysisResult.handle}`, pageWidth - margin - 50, footerY);

    // Save the PDF
    pdf.save(`gofundme-creator-report-${analysisResult.handle}.pdf`);
  };

  const getBrandFitColor = (score: number) => {
    if (score >= 75) return 'bg-green-500/20 text-green-300 border border-green-500/30';
    if (score >= 50) return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
    return 'bg-red-500/20 text-red-300 border border-red-500/30';
  };

  const getBrandFitIcon = (recommendation: string) => {
    if (recommendation === 'green') return <CheckCircle className="h-5 w-5 text-green-300" />;
    if (recommendation === 'amber') return <AlertTriangle className="h-5 w-5 text-yellow-300" />;
    return <XCircle className="h-5 w-5 text-red-300" />;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="glass-effect card-butterfly mb-6 flex flex-col gap-4 rounded-xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="butterfly-animation text-blue-500">
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <path
                fill="currentColor"
                d="M20 20c-2 0-4-2-4-5s2-5 4-5 4 2 4 5-2 5-4 5zm-8-3c-3 0-6-3-6-7s3-7 6-7c2 0 4 1 5 3-1 1-2 3-2 5s1 4 2 5c-1 2-3 3-5 3zm16 0c-2 0-4-1-5-3 1-1 2-3 2-5s-1-4-2-5c1-2 3-3 5-3 3 0 6 3 6 7s-3 7-6 7zm-8 3c-2 0-4 2-4 5s2 5 4 5 4-2 4-5-2-5-4-5zm-8 3c-3 0-6 3-6 7s3 7 6 7c2 0 4-1 5-3-1-1-2-3-2-5s1-4 2-5c-1 2-3 3-5 3zm16 0c-2 0-4 1-5 3 1 1 2 3 2 5s-1 4-2 5c1 2 3 3 5 3 3 0 6-3 6-7s-3-7-6-7z"
              />
            </svg>
          </div>
          <div>
            <h1 className="gradient-text text-3xl font-bold">Butterfly 3ffect</h1>
            <p className="text-sm text-blue-400">Creator Impact Calculator</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300 sm:self-auto">
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          LIVE DATA ENABLED
        </span>
      </div>
      
      <div className="glass-effect card-butterfly mb-6 rounded-xl p-4">
        <p className="text-sm text-blue-200">
          🎉 <strong>Live Instagram data enabled!</strong> This calculator now fetches real follower counts, engagement rates, and post content directly from Instagram using Apify. 
          {OPENAI_KEY ? ' AI-powered brand fit analysis included.' : ' Add your OpenAI key to enable AI-powered content analysis.'}
        </p>
      </div>
      
      {/* URL Input Section */}
      <div className="glass-effect card-butterfly mb-8 rounded-xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          Creator Analysis
          <span className="rounded border border-blue-500/30 bg-blue-500/20 px-2 py-1 text-xs text-blue-300">
            LIVE DATA
          </span>
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="mb-2 block text-sm text-blue-300">
              Paste any social media URL or handle (@username)
            </label>
            <input 
              type="text" 
              value={creatorUrl} 
              onChange={(e) => setCreatorUrl(e.target.value)}
              placeholder="https://instagram.com/humansofny or @humansofny" 
              className="w-full rounded-lg border border-blue-900/30 bg-black/50 p-3 text-white placeholder-blue-400/50 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => analyzeCreator(creatorUrl)}
              disabled={isAnalyzing || !creatorUrl}
              className={`btn-butterfly glow-blue relative p-3 px-6 rounded-lg text-white font-semibold transition-all duration-200 ${
                isAnalyzing || !creatorUrl 
                  ? 'cursor-not-allowed bg-blue-900/40 text-blue-200/60 shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transform hover:scale-105'
              }`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Creator'}
            </button>
          </div>
        </div>
        
        {isAnalyzing && (
          <div className="mt-4 rounded-lg border border-blue-900/30 bg-blue-500/10 p-3">
            <div className="flex items-center gap-2">
              <div className="relative h-4 w-4">
                <div className="h-4 w-4 rounded-full border-2 border-blue-500/30" />
                <div className="absolute left-0 top-0 h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
              </div>
              <span className="text-sm text-blue-200">
                🔥 Fetching live Instagram data via Apify API...
              </span>
            </div>
          </div>
        )}

        {analysisError && (
          <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-200">{analysisError}</span>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="mb-8 space-y-6">
          {/* Creator Profile Summary */}
          <div className="glass-effect card-butterfly rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500">
                  <span className="text-white font-bold text-lg">
                    {analysisResult.handle.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-semibold text-white">
                    @{analysisResult.handle}
                    {analysisResult.verified && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                    <span className="rounded border border-blue-500/30 bg-blue-500/20 px-2 py-1 text-xs text-blue-300">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-sm text-blue-200">{analysisResult.bio}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-400">Platform</div>
                <div className="font-medium capitalize text-white">{analysisResult.platform.replace('-', ' ')}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-effect card-butterfly rounded-xl p-4 text-center">
                <Users className="mx-auto mb-2 h-6 w-6 text-blue-400" />
                <div className="text-2xl font-bold text-white">
                  {analysisResult.followers.toLocaleString()}
                </div>
                <div className="text-sm text-blue-300">Followers</div>
              </div>
              
              <div className="glass-effect card-butterfly rounded-xl p-4 text-center">
                <TrendingUp className="mx-auto mb-2 h-6 w-6 text-blue-400" />
                <div className="gradient-text text-2xl font-bold">
                  {analysisResult.engagementRate}%
                </div>
                <div className="text-sm text-blue-300">Engagement Rate</div>
              </div>
              
              <div className="glass-effect card-butterfly rounded-xl p-4 text-center">
                <Heart className="mx-auto mb-2 h-6 w-6 text-blue-400" />
                <div className="text-2xl font-bold text-white">
                  {(() => {
                    const totalLikes = recentPosts.reduce((sum, post) => sum + post.likes, 0);
                    const avgLikes = Math.round(totalLikes / Math.max(recentPosts.length, 1));
                    console.log("UI Average Likes Calculation:", {
                      totalLikes,
                      postsLength: recentPosts.length,
                      avgLikes,
                      posts: recentPosts.map(p => ({ id: p.id, likes: p.likes }))
                    });
                    return avgLikes.toLocaleString();
                  })()}
                </div>
                <div className="text-sm text-blue-300">Avg Likes</div>
              </div>
              
              <div className="glass-effect card-butterfly rounded-xl p-4 text-center">
                <MessageCircle className="mx-auto mb-2 h-6 w-6 text-blue-400" />
                <div className="text-2xl font-bold text-white">
                  {(() => {
                    const totalComments = recentPosts.reduce((sum, post) => sum + post.comments, 0);
                    const avgComments = Math.round(totalComments / Math.max(recentPosts.length, 1));
                    console.log("UI Average Comments Calculation:", {
                      totalComments,
                      postsLength: recentPosts.length,
                      avgComments,
                      posts: recentPosts.map(p => ({ id: p.id, comments: p.comments }))
                    });
                    return avgComments.toLocaleString();
                  })()}
                </div>
                <div className="text-sm text-blue-300">Avg Comments</div>
              </div>
            </div>
          </div>

          {/* GoFundMe Brand Fit Analysis */}
          {brandFitScore && (
            <div className="glass-effect card-butterfly rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="flex items-center gap-2 text-xl font-semibold text-white">
                  Brand Fit Analysis
                  {getBrandFitIcon(brandFitScore.recommendation)}
                  {OPENAI_KEY && (
                    <span className="rounded border border-blue-500/30 bg-blue-500/20 px-2 py-1 text-xs text-blue-300">
                      AI POWERED
                    </span>
                  )}
                </h3>
                <div className={`rounded-full px-4 py-2 font-medium ${getBrandFitColor(brandFitScore.overallScore)}`}>
                  {brandFitScore.overallScore}/100 Overall Score
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="mb-1 text-3xl font-bold text-white">
                    <span className="gradient-text">{brandFitScore.causeAlignment}</span>/100
                  </div>
                  <div className="mb-2 text-sm font-medium text-blue-200">Cause Alignment</div>
                  <div className="h-2 w-full rounded-full bg-blue-900/30">
                    <div 
                      className="h-2 rounded-full bg-green-500 transition-all duration-500"
                      style={{width: `${brandFitScore.causeAlignment}%`}}
                    ></div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="mb-1 text-3xl font-bold text-white">
                    <span className="gradient-text">{brandFitScore.brandSafety}</span>/100
                  </div>
                  <div className="mb-2 text-sm font-medium text-blue-200">Brand Safety</div>
                  <div className="h-2 w-full rounded-full bg-blue-900/30">
                    <div 
                      className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                      style={{width: `${brandFitScore.brandSafety}%`}}
                    ></div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="mb-1 text-3xl font-bold text-white">
                    <span className="gradient-text">{brandFitScore.audienceAuthenticity}</span>/100
                  </div>
                  <div className="mb-2 text-sm font-medium text-blue-200">Audience Authenticity</div>
                  <div className="h-2 w-full rounded-full bg-blue-900/30">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{width: `${brandFitScore.audienceAuthenticity}%`}}
                    ></div>
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              <div className="glass-effect card-butterfly rounded-xl p-4">
                <h4 className="mb-3 font-semibold text-white">
                  {OPENAI_KEY ? 'AI Content Analysis' : 'Content Analysis Insights'}
                </h4>
                {brandFitScore.insights.aiAnalysis ? (
                  <p className="text-sm text-blue-200">{brandFitScore.insights.aiAnalysis}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3 text-blue-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{brandFitScore.insights.causeContent} posts mention charitable causes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>{brandFitScore.insights.riskFactors} potential brand safety concerns</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{brandFitScore.insights.engagedPosts} posts with high engagement</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendation */}
              <div className="glass-effect card-butterfly mt-4 rounded-xl border-l-4 border-l-blue-500 p-4">
                <div className="mb-1 font-semibold text-white">Partnership Recommendation:</div>
                <div className="text-sm text-blue-200">
                  {brandFitScore.recommendation === 'green' && 
                    "Excellent fit for GoFundMe campaigns. Strong cause alignment and authentic audience engagement make this creator ideal for nonprofit partnerships."}
                  {brandFitScore.recommendation === 'amber' && 
                    "Good potential for GoFundMe campaigns with proper brief and cause education. Monitor content alignment and provide clear guidelines."}
                  {brandFitScore.recommendation === 'red' && 
                    "Consider alternative creators. Limited cause alignment and potential brand safety concerns may not align with GoFundMe's mission."}
                </div>
              </div>
            </div>
          )}

          {/* Recent Posts Analysis */}
          <div className="glass-effect card-butterfly rounded-xl p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">Recent Posts Analysis</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recentPosts.map((post) => (
                <div key={post.id} className="glass-effect card-butterfly rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-blue-500/30 bg-blue-500/20 px-2 py-1 text-xs text-blue-300">
                        {post.type}
                      </span>
                      <span className="text-xs text-blue-400">{post.posted_ago}</span>
                    </div>
                    <div className="text-right">
                      <div className="gradient-text text-sm font-semibold">{post.engagement_rate}%</div>
                      <div className="text-xs text-blue-400">engagement</div>
                    </div>
                  </div>
                  <p className="mb-3 text-sm text-blue-200">{post.caption}</p>
                  <div className="flex gap-4 text-xs text-blue-300">
                    <span>❤️ {post.likes.toLocaleString()}</span>
                    <span>💬 {post.comments.toLocaleString()}</span>
                    {post.shares > 0 && <span>🔄 {post.shares.toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pricing Calculator */}
      {analysisResult && (
        <div className="glass-effect card-butterfly mb-8 rounded-xl p-6">
          <h3 className="mb-6 text-xl font-semibold text-white">Campaign Pricing Calculator</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="mb-2 block text-sm text-blue-300">Number of Deliverables</label>
              <input
                type="number"
                min="1"
                max="10"
                value={numDeliverables}
                onChange={(e) => setNumDeliverables(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-blue-900/30 bg-black/50 p-3 text-white transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            
            <div>
              <label className="mb-2 block text-sm text-blue-300">Exclusivity Period</label>
              <select 
                value={exclusivity}
                onChange={(e) => setExclusivity(e.target.value)}
                className="w-full rounded-lg border border-blue-900/30 bg-black/50 p-3 text-white transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="none">No Exclusivity</option>
                <option value="30-day">30 Days (+10%)</option>
                <option value="90-day">90 Days (+20%)</option>
                <option value="180-day">180 Days (+30%)</option>
                <option value="365-day">365 Days (+50%)</option>
              </select>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="mb-3 block text-sm text-blue-300">Usage Rights</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="brandRepost"
                  checked={usageRights.brandRepost}
                  onChange={(e) => setUsageRights({...usageRights, brandRepost: e.target.checked})}
                  className="mr-2 h-4 w-4 rounded border border-blue-900/30 bg-black/50 text-blue-500 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                />
                <label htmlFor="brandRepost" className="text-blue-200">Brand Repost (+10%)</label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="paidAds"
                  checked={usageRights.paidAds}
                  onChange={(e) => setUsageRights({...usageRights, paidAds: e.target.checked})}
                  className="mr-2 h-4 w-4 rounded border border-blue-900/30 bg-black/50 text-blue-500 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                />
                <label htmlFor="paidAds" className="text-blue-200">Paid Ads (+20%)</label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="website"
                  checked={usageRights.website}
                  onChange={(e) => setUsageRights({...usageRights, website: e.target.checked})}
                  className="mr-2 h-4 w-4 rounded border border-blue-900/30 bg-black/50 text-blue-500 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                />
                <label htmlFor="website" className="text-blue-200">Website Usage (+10%)</label>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="glass-effect card-butterfly rounded-xl p-6">
            <h4 className="mb-4 text-lg font-semibold text-white">Pricing Summary</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="mb-1 text-2xl font-bold text-white">
                  <span className="gradient-text">${baseRate.toLocaleString()}</span>
                </div>
                <div className="text-sm text-blue-300">Base Rate</div>
                <div className="mt-1 text-xs text-blue-400">
                  ({followerCount.toLocaleString()} × {engagementRate}%)
                </div>
              </div>
              
              <div className="text-center">
                <div className="mb-1 text-2xl font-bold text-white">
                  <span className="gradient-text">${finalPrice.toLocaleString()}</span>
                </div>
                <div className="text-sm text-blue-300">Final Price</div>
                <div className="mt-1 text-xs text-blue-400">
                  Including all add-ons
                </div>
              </div>
              
              <div className="text-center">
                <div className="mb-1 text-2xl font-bold text-white">
                  <span className="gradient-text">${Math.round(emv).toLocaleString()}</span>
                </div>
                <div className="text-sm text-blue-300">EMV</div>
                <div className="mt-1 text-xs text-blue-400">
                  {Math.round((emv / finalPrice) * 100)}% ROI
                </div>
              </div>
            </div>

            {/* Campaign Summary */}
            <div className="glass-effect card-butterfly rounded-xl p-4">
              <h5 className="mb-2 font-semibold text-white">Campaign Summary</h5>
              <div className="space-y-1 text-sm text-blue-200">
                <p><strong className="text-white">Creator:</strong> @{analysisResult.handle} ({analysisResult.followers.toLocaleString()} followers)</p>
                <p><strong className="text-white">Deliverables:</strong> {numDeliverables} × {contentType.replace('-', ' ')} content</p>
                <p><strong className="text-white">Engagement Rate:</strong> {engagementRate}% (Industry benchmark: 1-3%)</p>
                {brandFitScore && (
                <p>
                  <strong className="text-white">Brand Fit:</strong> {brandFitScore.overallScore}/100 ({brandFitScore.recommendation.toUpperCase()})
                </p>
                )}
                <p><strong className="text-white">Estimated Reach:</strong> {Math.round(followerCount * 0.3 * (1 + engagementRate / 5)).toLocaleString()} people</p>
                {exclusivity !== 'none' && (
                  <p>
                    <strong className="text-white">Exclusivity:</strong> {exclusivity.replace('-', ' ')} (+{(exclusivityRates[exclusivity as ExclusivityKey] ?? 0) * 100}%)
                  </p>
                )}
              </div>
            </div>

            {/* Generate Report Button */}
            <div className="flex justify-center mt-6">
              <button 
                onClick={generateReport}
                className="btn-butterfly glow-blue flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-white font-semibold transition-all duration-200 hover:from-blue-500 hover:to-blue-400 transform hover:scale-105"
              >
                <Download className="w-4 h-4" />
                Generate PDF Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="glass-effect card-butterfly rounded-xl p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">How the Live Creator Calculator Works</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="mb-2 font-semibold text-blue-300">🔗 Live Data Integration</h4>
            <div className="space-y-1 text-sm text-blue-200">
              <p><strong className="text-white">Apify Instagram Scraper:</strong> Real follower counts, engagement rates, recent posts</p>
              <p><strong className="text-white">OpenAI GPT-4:</strong> AI-powered content analysis for brand fit scoring</p>
              <p><strong className="text-white">Real-time Processing:</strong> Fresh data for every analysis</p>
              <p><strong className="text-white">Fallback Mode:</strong> Simulated data when APIs unavailable</p>
            </div>
          </div>
          
          <div>
            <h4 className="mb-2 font-semibold text-blue-300">🧮 Pricing & Analysis</h4>
            <div className="space-y-1 text-sm text-blue-200">
              <p><strong className="text-white">Base Rate:</strong> Followers × Engagement Rate</p>
              <p><strong className="text-white">EMV:</strong> Estimated Reach × $5 CPM (nonprofit rate)</p>
              <p><strong className="text-white">Brand Fit:</strong> AI analysis of cause alignment & brand safety</p>
              <p><strong className="text-white">Final Price:</strong> Base Rate + Usage Rights + Exclusivity</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-blue-900/30 bg-blue-500/10 p-3 text-sm text-blue-200">
            <strong className="text-white">✅ With Live APIs:</strong> Real Instagram data, AI content analysis, accurate engagement metrics, up-to-date follower counts
          </div>
          <div className="rounded-lg border border-blue-900/30 bg-blue-500/10 p-3 text-sm text-blue-200">
            <strong className="text-white">📊 Demo Mode:</strong> Simulated but realistic data based on handle analysis, consistent results for testing
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoFundMeInfluencerCalculator;