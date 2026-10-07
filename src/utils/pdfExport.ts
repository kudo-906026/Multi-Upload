import { jsPDF } from 'jspdf';
import { AIAnalysisResult } from '@shared/types';

export function exportTrendAnalysisPDF(analysis: AIAnalysisResult) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper for checking page overflow
  const checkNewPage = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeaderBanner(true);
    }
  };

  // Header Banner
  const drawHeaderBanner = (isContinued = false) => {
    // Dark header box
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, contentWidth, isContinued ? 12 : 24, 'F');

    // Accent line
    doc.setFillColor(99, 102, 241); // indigo-500
    doc.rect(margin, y, 3, isContinued ? 12 : 24, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isContinued ? 11 : 16);
    doc.text(
      isContinued ? 'OmniPost Video Report (Continued)' : 'OmniPost Video Executive Report',
      margin + 8,
      y + (isContinued ? 8 : 10)
    );

    if (!isContinued) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text(
        'Gemini AI Trend Analysis with Google Search Grounding & D3 Forecast',
        margin + 8,
        y + 17
      );

      // Metadata chip on right
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      doc.text(`Date: ${dateStr}`, pageWidth - margin - 35, y + 10);
      doc.text('Status: Verified', pageWidth - margin - 35, y + 16);
    }

    y += (isContinued ? 16 : 30);
  };

  // Draw initial header
  drawHeaderBanner(false);

  // Topic & Tone Overview Box
  checkNewPage(26);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('Video Topic / Focus:', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(analysis.topic || 'Untitled Video Asset', margin + 44, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Delivery Style / Tone:', margin + 4, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(analysis.detectedTone || 'High Energy & Viral', margin + 44, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Target Platforms:', margin + 105, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text('YouTube Shorts & Instagram Reels', margin + 135, y + 15);

  y += 28;

  // Section 1: Executive Key Insights
  if (analysis.keyInsights && analysis.keyInsights.length > 0) {
    checkNewPage(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Strategic Algorithmic Insights', margin, y);
    y += 5;

    analysis.keyInsights.forEach((insight) => {
      checkNewPage(10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      doc.setFillColor(99, 102, 241);
      doc.circle(margin + 2, y - 1, 1, 'F');

      const splitText = doc.splitTextToSize(insight, contentWidth - 10);
      doc.text(splitText, margin + 6, y);
      y += splitText.length * 4.5 + 2;
    });

    y += 4;
  }

  // Section 2: Google Search Grounded Web Trends
  if (analysis.groundedTrends && analysis.groundedTrends.length > 0) {
    checkNewPage(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Google Search Grounded Trends & Hashtags', margin, y);
    y += 6;

    analysis.groundedTrends.forEach((trend, idx) => {
      checkNewPage(20);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 16, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`Search Query: "${trend.query}"`, margin + 4, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      if (trend.contextNote) {
        doc.text(trend.contextNote, margin + 4, y + 10);
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text(
        `Trending Tags: ${trend.trendingKeywords.join('  ')}`,
        margin + 4,
        y + 14
      );

      y += 19;
    });

    y += 3;
  }

  // Section 3: D3.js Predicted Growth Trajectory
  if (analysis.predictedGrowth && analysis.predictedGrowth.length > 0) {
    checkNewPage(55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('3. D3.js Projected Growth Performance Matrix', margin, y);
    y += 6;

    // Table Header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);

    const colWidth = contentWidth / 4;
    doc.text('Timeline Step', margin + 4, y + 4.8);
    doc.text('YouTube Shorts (Views)', margin + colWidth + 4, y + 4.8);
    doc.text('Instagram Reels (Reach)', margin + colWidth * 2 + 4, y + 4.8);
    doc.text('Search Interest Score', margin + colWidth * 3 + 4, y + 4.8);
    y += 7;

    // Table Rows
    analysis.predictedGrowth.forEach((row, rIdx) => {
      checkNewPage(7);
      doc.setFillColor(rIdx % 2 === 0 ? 248 : 255, rIdx % 2 === 0 ? 250 : 255, rIdx % 2 === 0 ? 252 : 255);
      doc.rect(margin, y, contentWidth, 6.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(row.label, margin + 4, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 38, 38); // red-600
      doc.text(`${row.youtubeViews.toLocaleString()} views`, margin + colWidth + 4, y + 4.5);

      doc.setTextColor(219, 39, 119); // pink-600
      doc.text(`${row.instagramViews.toLocaleString()} reach`, margin + colWidth * 2 + 4, y + 4.5);

      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text(`${row.searchInterest}% / 100`, margin + colWidth * 3 + 4, y + 4.5);

      y += 6.5;
    });

    y += 6;
  }

  // Section 4: Platform Metadata Specifications
  checkNewPage(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Platform Metadata Specifications', margin, y);
  y += 6;

  // YouTube Box
  checkNewPage(35);
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(254, 202, 202); // red-200
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text('YouTube Shorts Package', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Title:', margin + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(analysis.youtube?.title || '', contentWidth - 25), margin + 18, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Tags:', margin + 4, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.text(
    doc.splitTextToSize((analysis.youtube?.tags || []).slice(0, 7).join(', '), contentWidth - 25),
    margin + 18,
    y + 19
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Hashtags:', margin + 4, y + 26);
  doc.setFont('helvetica', 'normal');
  doc.text((analysis.youtube?.hashtags || []).join(' '), margin + 22, y + 26);

  y += 36;

  // Instagram Box
  checkNewPage(35);
  doc.setFillColor(253, 242, 248); // pink-50
  doc.setDrawColor(251, 207, 232); // pink-200
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(190, 24, 93); // pink-700
  doc.text('Instagram Reels Package', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Hook:', margin + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(analysis.instagram?.hookSentence || '', contentWidth - 25), margin + 18, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Audio:', margin + 4, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.text(analysis.instagram?.recommendedAudio || 'Trending Audio', margin + 18, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.text('Hashtags:', margin + 4, y + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(
    doc.splitTextToSize((analysis.instagram?.hashtags || []).slice(0, 8).join(' '), contentWidth - 25),
    margin + 22,
    y + 25
  );

  y += 35;

  // Client Approval Sign-Off Block
  checkNewPage(25);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 20, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Client Review & Approval Sign-Off:', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('[  ] Approved for Auto-Publishing', margin + 4, y + 14);
  doc.text('[  ] Revisions Requested', margin + 60, y + 14);
  doc.text('Signature: __________________________', margin + 115, y + 14);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `OmniPost Video Intelligence • Confidential Report • Page ${i} of ${totalPages}`,
      margin,
      pageHeight - 8
    );
  }

  // Trigger browser download
  const cleanTopic = (analysis.topic || 'Video')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);
  doc.save(`OmniPost_Trend_Analysis_${cleanTopic}.pdf`);
}
