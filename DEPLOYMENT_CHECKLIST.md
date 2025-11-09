# Deployment Checklist - Vercel Blob Audio Streaming

Use this checklist to ensure a smooth deployment of your audio streaming feature.

## ✅ Pre-Deployment Checklist

### 1. Environment Setup
- [ ] `BLOB_READ_WRITE_TOKEN` configured in `.env.local`
- [ ] `MAPBOX_ACCESS_TOKEN` configured in `.env.local`
- [ ] Dependencies installed (`pnpm install` completed)
- [ ] No TypeScript errors (`pnpm run build` passes)

### 2. Audio Files
- [ ] All 15 audio files exist in `public/audio/` OR
- [ ] Audio files uploaded to Vercel Blob (migration script run successfully)
- [ ] `data/audio-markers.ts` updated with Blob URLs
- [ ] File sizes reasonable (< 10MB per file recommended)
- [ ] Audio format is MP3 or M4A (best browser compatibility)

### 3. Code Integration
- [ ] `app/page.tsx` uses `StreamingAudioPlayer` component
- [ ] No import errors for streaming components
- [ ] TypeScript types are correct
- [ ] No console errors in development mode

### 4. Local Testing
- [ ] Development server starts (`pnpm dev`)
- [ ] Map loads with Mapbox terrain
- [ ] Audio markers visible on map
- [ ] Clicking marker opens streaming player
- [ ] Audio plays successfully
- [ ] Buffering indicator works
- [ ] Seeking works (progress bar drag)
- [ ] Volume control works
- [ ] Network indicator shows
- [ ] Keyboard shortcuts work (Space, J, L, arrows)
- [ ] Mobile responsive (test on phone or browser dev tools)

### 5. Performance Verification
- [ ] Audio loads in < 2 seconds on good connection
- [ ] Seeking is instant (< 500ms)
- [ ] No console errors during playback
- [ ] Memory usage stable (no leaks)
- [ ] Buffer underruns minimal (< 1 per playback)

### 6. Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces player state
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets ≥ 44x44px on mobile

## 🚀 Vercel Deployment

### 1. Prepare Vercel Project

#### Option A: New Project
```bash
# Push code to GitHub
git add .
git commit -m "Add Vercel Blob audio streaming"
git push origin main

# Go to https://vercel.com/new
# Import your GitHub repository
```

#### Option B: Existing Project
```bash
# Just push your changes
git add .
git commit -m "Add Vercel Blob audio streaming"
git push origin main
# Vercel will auto-deploy
```

### 2. Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value | Environments |
|----------|-------|--------------|
| `MAPBOX_ACCESS_TOKEN` | pk.eyJ... | Production, Preview, Development |
| `BLOB_READ_WRITE_TOKEN` | vercel_blob_rw_... | Production, Preview, Development |

**Important:**
- ✅ Use the SAME Blob token as local (so it accesses the same storage)
- ✅ Set for all environments (Production, Preview, Development)
- ✅ Save and redeploy if adding after initial deployment

### 3. Deploy

```bash
# Via Vercel CLI (recommended)
vercel --prod

# Or via Git push (auto-deploy)
git push origin main
```

### 4. Post-Deployment Verification

- [ ] Deployment succeeded (no errors in Vercel logs)
- [ ] Production URL accessible
- [ ] Map loads on production
- [ ] Audio markers visible
- [ ] Click marker opens player
- [ ] Audio plays on production
- [ ] Test on mobile device (actual phone)
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Check Vercel Blob dashboard (requests being served)

## 🔍 Testing Checklist

### Desktop Testing (5 minutes)
- [ ] Chrome: Audio playback works
- [ ] Firefox: Audio playback works
- [ ] Safari: Audio playback works
- [ ] Edge: Audio playback works
- [ ] Keyboard shortcuts work in all browsers

### Mobile Testing (5 minutes)
- [ ] iOS Safari: Audio playback works
- [ ] iOS Chrome: Audio playback works
- [ ] Android Chrome: Audio playback works
- [ ] Touch controls work
- [ ] Player layout responsive
- [ ] Network indicator shows correctly

### Network Conditions (3 minutes)
- [ ] Fast 3G: Audio loads and plays
- [ ] Slow 3G: Buffering indicator shows, audio eventually plays
- [ ] Offline: Error message shown gracefully

### Accessibility (3 minutes)
- [ ] Tab through controls (keyboard only)
- [ ] Space bar plays/pauses
- [ ] Arrow keys seek
- [ ] Screen reader announces state (test with NVDA/VoiceOver)

## 📊 Monitoring Setup

### Vercel Analytics (Free)
Already enabled via `@vercel/analytics` in your project.

### Vercel Blob Usage
Monitor at: https://vercel.com/dashboard/stores

Check:
- [ ] Storage usage (< 1GB on free tier)
- [ ] Bandwidth usage (< 100GB/month on hobby tier)
- [ ] Request count
- [ ] Any errors or failed requests

### Performance Monitoring (Optional)

Add to `app/page.tsx` for custom tracking:

```typescript
// Example: Track audio load times
useEffect(() => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'audio_feature_ready', {
      total_markers: audioMarkers.length,
      blob_storage: 'enabled'
    })
  }
}, [])
```

## 🐛 Common Issues & Fixes

### Issue: "BLOB_READ_WRITE_TOKEN not configured"
**Fix:** Add token to Vercel environment variables and redeploy

### Issue: Audio doesn't play on iPhone
**Fix:** iOS requires user interaction before playing audio. Make sure play button is clicked manually.

### Issue: 404 errors for audio files
**Fix:**
1. Check Blob URLs in `data/audio-markers.ts` are correct
2. Verify files uploaded to Blob: `pnpm tsx scripts/migrate-audio-to-blob.ts`
3. Check Vercel Blob dashboard

### Issue: Slow loading
**Fix:**
1. Check file sizes (compress if > 5MB)
2. Verify CDN is serving files (check response headers)
3. Check network tab in browser DevTools

### Issue: Build fails on Vercel
**Fix:**
1. Check build logs for specific error
2. Run `pnpm run build` locally
3. Fix TypeScript errors
4. Ensure all dependencies in `package.json`

## 🎯 Performance Targets

After deployment, verify these metrics:

| Metric | Target | How to Check |
|--------|--------|--------------|
| Time to First Byte | < 200ms | Network tab, first audio request |
| Audio Load Time | < 2s | Player shows loading indicator |
| Seek Latency | < 500ms | Drag progress bar |
| Buffer Underruns | < 1 per play | Player performance info |
| Error Rate | < 1% | Vercel Blob dashboard |

## 🔐 Security Checklist

- [ ] Blob tokens not committed to Git (in `.gitignore`)
- [ ] Environment variables properly scoped
- [ ] CORS configured correctly (automatic with Vercel Blob)
- [ ] No sensitive data in audio filenames
- [ ] Rate limiting considered (optional for admin endpoints)

## 📈 Post-Launch Monitoring (First Week)

### Day 1
- [ ] Check Vercel logs for errors
- [ ] Monitor Blob bandwidth usage
- [ ] Test on various devices

### Day 3
- [ ] Review user feedback
- [ ] Check error rates in Vercel dashboard
- [ ] Verify bandwidth usage trending as expected

### Day 7
- [ ] Calculate storage costs (if any)
- [ ] Review performance metrics
- [ ] Plan optimizations if needed

## 🎉 Success Criteria

Your deployment is successful when:

✅ All audio files stream correctly on production
✅ Mobile and desktop both work
✅ No errors in Vercel logs for 24 hours
✅ Blob bandwidth < 100GB/month (hobby tier limit)
✅ User feedback is positive
✅ Performance targets met

## 🆘 Rollback Plan

If critical issues occur:

### Quick Rollback
```bash
# Revert to previous deployment in Vercel Dashboard
# Settings → Deployments → Previous → Promote to Production
```

### Code Rollback
```bash
# Revert Git commit
git revert HEAD
git push origin main

# Or restore old audio player
# In app/page.tsx: Change StreamingAudioPlayer back to AudioPlayer
```

## 📞 Support Resources

- **Vercel Support:** https://vercel.com/support
- **Vercel Blob Docs:** https://vercel.com/docs/storage/vercel-blob
- **Mapbox Support:** https://docs.mapbox.com/help/
- **Project Docs:** See `/QUICKSTART.md` and `/STREAMING_AUDIO_IMPLEMENTATION.md`

---

**Last Updated:** $(date)
**Version:** 1.0.0
**Maintainer:** [Your Name]
