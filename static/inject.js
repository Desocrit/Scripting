/**
 * inject.js
 *
 * This file is injected into all loaded pages - it handles right clicks
 * and annotations
 */


/**
 * This is the context menu
 */
var menu;

/**
 * The last element to be right clicked - attacjed to annotations
 *
 * @see addAnnotations()
 * @see window.oncontextmenu()
 */ 
var currentElement;

/**
 * The last oncontextmenu event - used to find the mouse coords when
 * adding an annotation
 *
 * @see addAnnotation()
 * @see window.oncontextmenu()
 */
var e;

/**
 * getOffset calculates the absolute left / top positions for a given
 * element
 *
 * @param element The element to test
 * @param test    "Left" / "Top"
 * @see ajax.js:getOffset()
 */
var getOffset = window.parent.getOffset;

/**
 * Handles write clicks for the annotate menu
 */
window.oncontextmenu = (function(_e)
{
    var el = _e.toElement || _e.target;
    if (el.isAnnotation) return true;

    menu.style.display = 'block';
    menu.style.left    = _e.pageX + 'px';
    menu.style.top     = _e.pageY + 'px';
    currentElement     = el.id;
    e                  = _e;

    return false;
});

/**
 * As elements are linked to elements, when the frame is resized, we
 * need to reposition them
 */
window.onresize = (function()
{
    for (var i in window.parent.annotations)
    {
        window.parent.annotations[i].resize();
    }
});

/**
 * Makes an annotation box and pushes in into the parent window's
 * "annotations" store
 *
 * @param x      The relative x position
 * @param y      The relative y position
 * @param el     The element this is attached to
 * @param text   The text value of this annotation
 * @param uniqid This annotation's id
 */
var makeAnnotation = (function(x, y, el, text, uniqid)
{
    /* ANNOTATION WRAPPER */
    var annotationWrap = document.createElement('div');
        annotationWrap.className = 'annotation_wrap';
        annotationWrap.isAnnotation   = true;
        annotationWrap.subjectElement = document.getElementById(el);
        annotationWrap.uniqid         = uniqid;
        annotationWrap.relativeCoords = { "x" : x, "y" : y };
        annotationWrap.style.top      =
            getOffset(annotationWrap.subjectElement, 'Top')  + y + 'px';
        annotationWrap.style.left     =
            getOffset(annotationWrap.subjectElement, 'Left') + x + 'px';
        annotationWrap.resize         = (function()
        {
            this.style.left      =
                  this.relativeCoords.x
                + getOffset(this.subjectElement, 'Left')
                + 'px';
            this.style.top      =
                  this.relativeCoords.y
                + getOffset(this.subjectElement, 'Top')
                + 'px';
        });

    /* CONTENT TEXT AREA */
    var annotationContent = document.createElement('textarea');
        annotationContent.className = 'annotation_text';
        annotationContent.value           = text;
        annotationContent.placeholder     = 'Type Here...';
        annotationContent.contentEditable = true;
        annotationContent.isAnnotation    = true;
        annotationContent.onblur          = window.parent.saveAnnotation;
        annotationContent.wrapper         = annotationWrap;
        annotationWrap.contentEl          = annotationContent;
        annotationContent.onfocus         =
            (function() { this.wrapper.inEdit = true; });


    /* CLOSE BUTTON */
    var closeDiv = document.createElement('div');
        closeDiv.className = 'close';
        closeDiv.uniqid = annotationWrap.uniqid;

    var closeX = document.createElement('span');
        closeX.className = 'closeX';
        closeX.innerHTML = 'x';
        closeX.uniqid    = uniqid;
        closeX.wrapper   = annotationWrap;
        closeX.onclick   = (function()
        {
            window.parent.jsonCall
            (
                'delete annotation', 'uniqid=' + this.uniqid,
                (function(){}), (function(){})
            );
            delete window.parent.annotations[this.uniqid];
            document.body.removeChild(this.wrapper);
        });

    // Add the elements to the page and hide the context menu
    menu.style.display = 'none';
    document.body.appendChild(annotationWrap);
    annotationWrap.appendChild(annotationContent);
    annotationWrap.appendChild(closeDiv);
    closeDiv.appendChild(closeX);

    // Tell the parent window about this
    window.parent.annotations[annotationWrap.uniqid] = annotationWrap;
    
    // JQuery is silly...
    $(".annotation_wrap").draggable
    ({
        stop: window.parent.saveAnnotation,
        start: (function() { this.inEdit = true; })
    }).resizable();

    $(".annotation_wrap").on("mouseout", function() {
        $(this).draggable( {disabled: false});
    })
});

/**
 * Adds a blank annotation
 *
 * It will uses global variables set by the mouse event listener
 *
 * @see window.oncontextmenu
 */
var addAnnotation = (function()
{
    var el = document.getElementById(currentElement);

    makeAnnotation
    (
        e.pageX - getOffset(el, 'Left'),
        e.pageY - getOffset(el, 'Top'),
        currentElement,
        "",
        generateUid()
    );
});

/**
 * Sets up this frame by creating the menu and notifying the parent
 * window
 */
$(document).ready(function()
{
    menu = document.createElement('div');
    menu.style.display  = 'none';
    menu.style.width    = '300px';
    menu.style.position = 'absolute';

        var a       = document.createElement('a');
        a.onclick   = addAnnotation;
        a.innerHTML = 'Add Annotation';
        a.className = 'context_menu';
        menu.appendChild(a);

    document.body.appendChild(menu);

    window.parent.annotations = { };
    window.parent.setCallback(makeAnnotation);
});

/**
 * Generates a unique id for the annotations
 *
 * @source https://stackoverflow.com/a/12223573/1450080
 */
var generateUid = function ()
{
    var delim = '';

    function S4()
    {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    return (S4() + S4() + delim + S4() + delim + S4() + delim + S4() + delim + S4() + S4() + S4());
};