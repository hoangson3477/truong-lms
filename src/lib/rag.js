import { createClient } from './supabase'

/**
 * Retrieval-Augmented Generation (RAG) utility for AI chat
 * Helps find relevant content from uploaded study materials
 */

export class RAGService {
  constructor(supabase) {
    this.supabase = supabase
  }

  /**
   * Search for relevant content in uploaded materials
   * @param {string} query - Search query
   * @param {string} studentId - Student ID to filter materials
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Relevant document chunks
   */
  async searchMaterials(query, studentId, limit = 5) {
    try {
      // First, get all materials for this student
      const { data: materials, error: materialsError } = await this.supabase
        .from('study_materials')
        .select('id, file_name, file_url, file_type, content')
        .eq('student_id', studentId)

      if (materialsError) throw materialsError

      // For now, we'll do a simple text search
      // In a production system, you'd use vector embeddings with pgvector
      const searchTerms = query.toLowerCase().split(/\s+/)
      const results = []

      for (const material of materials) {
        // Skip if no content extracted
        if (!material.content) continue

        const content = material.content.toLowerCase()
        let score = 0
        let matchedTerms = 0

        // Simple term frequency scoring
        for (const term of searchTerms) {
          if (content.includes(term)) {
            matchedTerms++
            // Count occurrences
            const matches = content.split(term).length - 1
            score += matches
          }
        }

        // Normalize score
        if (searchTerms.length > 0) {
          score = score / searchTerms.length
        }

        // Only include if we have some matches
        if (matchedTerms > 0) {
          results.push({
            ...material,
            score,
            matchedTerms,
            // Extract a snippet around the first match
            snippet: this.extractSnippet(content, searchTerms[0])
          })
        }
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score)

      // Return top results
      return results.slice(0, limit)
    } catch (error) {
      console.error('RAG search error:', error)
      return []
    }
  }

  /**
   * Extract a snippet of text around a search term
   */
  extractSnippet(text, term, contextLength = 100) {
    const index = text.toLowerCase().indexOf(term.toLowerCase())
    if (index === -1) return text.substring(0, contextLength * 2)

    const start = Math.max(0, index - contextLength)
    const end = Math.min(text.length, index + term.length + contextLength)

    let snippet = text.substring(start, end)
    if (start > 0) snippet = '...' + snippet
    if (end < text.length) snippet = snippet + '...'

    return snippet
  }

  /**
   * Format search results for inclusion in AI prompt
   */
  formatContextForPrompt(results) {
    if (results.length === 0) return ''

    let context = '\n\n**TÀI LIỆU THAM KHẢO TỪ FILE ĐÃ UPLOAD:**\n'
    results.forEach((result, index) => {
      context += `\n${index + 1}. Từ file "${result.file_name}":\n`
      context += `   ${result.snippet}\n`
    })
    context += '\n**Hãy trả lời dựa trên thông tin trên nếu liên quan đến câu hỏi.**\n'

    return context
  }
}

/**
 * Helper function to get RAG service instance
 */
export function getRAGService() {
  const supabase = createClient()
  return new RAGService(supabase)
}