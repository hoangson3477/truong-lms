// src/app/api/analytics/route.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 })
    }

    // Get student ID
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profileData) {
      return NextResponse.json({ error: 'Không tìm thấy profile!' }, { status: 404 })
    }

    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', profileData.id)
      .single()

    if (!studentData) {
      return NextResponse.json({ error: 'Không tìm thấy sinh viên!' }, { status: 404 })
    }

    const studentId = studentData.id

    // Get learning analytics data
    const [
      plansData,
      progressData,
      statsData,
      quizAttemptsData
    ] = await Promise.all([
      // Get study plans with progress
      supabase
        .from('study_plans')
        .select('*, study_units(completed_at)')
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false }),

      // Get detailed progress data
      supabase
        .from('study_progress')
        .select('*, study_units(title, unit_order), study_plans(title, subject)')
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false }),

      // Get current stats
      supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', studentId)
        .single(),

      // Get quiz attempts for performance trends
      supabase
        .from('quiz_attempts')
        .select('*, quizzes(title, subject)')
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false })
        .limit(20)
    ])

    // Process analytics data
    const analytics = processAnalyticsData(
      plansData.data || [],
      progressData.data || [],
      statsData.data,
      quizAttemptsData.data || []
    )

    return NextResponse.json({ analytics })

  } catch (err) {
    console.error('Analytics error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Process raw data into meaningful analytics
function processAnalyticsData(plans, progress, stats, quizAttempts) {
  // Subject-wise performance
  const subjectStats = {}

  plans.forEach(plan => {
    const subject = plan.subject
    if (!subjectStats[subject]) {
      subjectStats[subject] = {
        totalPlans: 0,
        completedPlans: 0,
        totalXP: 0,
        averageProgress: 0,
        totalTimeSpent: 0
      }
    }

    subjectStats[subject].totalPlans++
    if (plan.status === 'completed') subjectStats[subject].completedPlans++
    subjectStats[subject].totalXP += plan.progress // Simplified, would need actual XP from progress
    subjectStats[subject].averageProgress += plan.progress || 0
  })

  // Calculate averages
  Object.keys(subjectStats).forEach(subject => {
    const stat = subjectStats[subject]
    if (stat.totalPlans > 0) {
      stat.averageProgress = stat.averageProgress / stat.totalPlans
    }
  })

  // Progress trends over time
  const progressTimeline = progress.map(p => ({
    date: p.completed_at || p.created_at,
    score: p.score || 0,
    xp: p.xp_earned || 0,
    timeSpent: p.time_spent || 0,
    unitTitle: p.study_units?.title || 'Unknown',
    subject: p.study_plans?.subject || 'Unknown'
  })).sort((a, b) => new Date(a.date) - new Date(b.date))

  // Quiz performance trends
  const quizTrends = quizAttempts.map(q => ({
    date: q.completed_at,
    score: q.score,
    total: q.total_questions,
    percentage: q.total_questions > 0 ? (q.score / q.total_questions) * 100 : 0,
    quizTitle: q.quizzes?.title || 'Unknown Quiz',
    subject: q.quizzes?.subject || 'Unknown'
  }))

  // Learning velocity (XP per day over last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentProgress = progress.filter(p =>
    p.completed_at && new Date(p.completed_at) >= sevenDaysAgo
  )

  const weeklyXP = recentProgress.reduce((sum, p) => sum + (p.xp_earned || 0), 0)
  const weeklyTimeSpent = recentProgress.reduce((sum, p) => sum + (p.time_spent || 0), 0)

  // Strengths and weaknesses analysis
  const subjectPerformance = {}
  progress.forEach(p => {
    const subject = p.study_plans?.subject || 'Unknown'
    if (!subjectPerformance[subject]) {
      subjectPerformance[subject] = {
        scores: [],
        attempts: 0,
        totalXP: 0
      }
    }

    if (p.score !== null) {
      subjectPerformance[subject].scores.push(p.score)
    }
    subjectPerformance[subject].attempts++
    subjectPerformance[subject].totalXP += p.xp_earned || 0
  })

  const strengths = []
  const weaknesses = []

  Object.keys(subjectPerformance).forEach(subject => {
    const perf = subjectPerformance[subject]
    const avgScore = perf.scores.length > 0
      ? perf.scores.reduce((a, b) => a + b, 0) / perf.scores.length
      : 0

    if (avgScore >= 80) {
      strengths.push({ subject, score: avgScore.toFixed(1) })
    } else if (avgScore < 60 && perf.attempts >= 2) {
      weaknesses.push({ subject, score: avgScore.toFixed(1) })
    }
  })

  // Sort strengths and weaknesses
  strengths.sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
  weaknesses.sort((a, b) => parseFloat(a.score) - parseFloat(b.score))

  return {
    overview: {
      totalXP: stats?.total_xp || 0,
      currentLevel: stats?.level || 1,
      currentStreak: stats?.current_streak || 0,
      longestStreak: stats?.longest_streak || 0,
      totalPlans: plans.length,
      completedPlans: plans.filter(p => p.status === 'completed').length,
      averageProgress: plans.length > 0
        ? (plans.reduce((sum, p) => sum + (p.progress || 0), 0) / plans.length).toFixed(1)
        : 0
    },
    subjectPerformance: subjectStats,
    progressTimeline: progressTimeline.slice(0, 20), // Last 20 activities
    quizTrends: quizTrends.slice(0, 10), // Last 10 quiz attempts
    weeklyMetrics: {
      xpEarned: weeklyXP,
      timeSpentMinutes: Math.round(weeklyTimeSpent / 60),
      activeDays: [...new Set(recentProgress.map(p =>
        p.completed_at ? new Date(p.completed_at).toDateString() : ''
      ).filter(Boolean))].length
    },
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    learningVelocity: {
      xpPerDay: weeklyXP > 0 ? weeklyXP / 7 : 0,
      minutesPerDay: weeklyTimeSpent > 0 ? weeklyTimeSpent / 60 / 7 : 0
    }
  }
}